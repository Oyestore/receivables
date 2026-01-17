import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';
import { AuditTrailService } from './audit-trail.service';
import { InvoiceCacheService } from './invoice-cache.service';
import { MetricsService } from './metrics.service';
import { LoggerService } from './logger.service';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    private readonly auditService: AuditTrailService,
    private readonly cacheService: InvoiceCacheService,
    private readonly metricsService: MetricsService,
    private readonly loggerService: LoggerService,
  ) { }

  // CREATE with audit trail
  async create(createInvoiceDto: CreateInvoiceDto, userId: string): Promise<Invoice> {
    const startTime = Date.now();

    const invoiceData = this.invoiceRepository.create(createInvoiceDto as DeepPartial<Invoice>);
    const calculatedInvoice = this.calculateTotals(invoiceData);
    const savedInvoice = await this.invoiceRepository.save(calculatedInvoice);

    // Capture version
    await this.auditService.captureVersion(savedInvoice, userId, 'Initial creation', 'created');

    // Metrics & Logging
    this.metricsService.recordInvoiceCreated(savedInvoice.tenant_id, savedInvoice.status);
    this.loggerService.logInvoiceCreated(savedInvoice.id, savedInvoice.tenant_id, savedInvoice.grand_total);
    this.metricsService.recordProcessingTime('create', (Date.now() - startTime) / 1000);

    return savedInvoice;
  }

  // FIND ALL with pagination and caching
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<PaginatedResult<Invoice>> {
    const startTime = Date.now();

    // Check cache first
    const cachedList = await this.cacheService.getInvoiceList(tenantId, page, limit);
    if (cachedList) {
      this.metricsService.recordCacheHit('invoice_list');
      return cachedList as any; // Would need full pagination metadata in cache
    }

    this.metricsService.recordCacheMiss('invoice_list');

    const skip = (page - 1) * limit;

    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where: { tenant_id: tenantId },
      skip,
      take: limit,
      order: { [sortBy]: sortOrder },
      relations: ['line_items'],
    });

    const result: PaginatedResult<Invoice> = {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    // Cache the result
    await this.cacheService.setInvoiceList(tenantId, page, limit, invoices);

    this.metricsService.recordDbQueryTime('findAll', (Date.now() - startTime) / 1000);

    return result;
  }

  // FIND ONE with caching
  async findOne(id: string, tenantId: string): Promise<Invoice> {
    // Check cache
    const cached = await this.cacheService.getInvoice(id);
    if (cached && cached.tenant_id === tenantId) {
      this.metricsService.recordCacheHit('invoice');
      return cached;
    }

    this.metricsService.recordCacheMiss('invoice');

    const invoice = await this.invoiceRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['line_items'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    // Cache it
    await this.cacheService.setInvoice(invoice);

    return invoice;
  }

  // UPDATE with audit trail
  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    tenantId: string,
    userId: string,
  ): Promise<Invoice> {
    const existingInvoice = await this.findOne(id, tenantId);

    const updateData: DeepPartial<Invoice> = { ...updateInvoiceDto };

    if (updateInvoiceDto.line_items) {
      const existingLineItems = existingInvoice.line_items || [];
      const newLineItems = updateInvoiceDto.line_items.map((item) => {
        const existing = existingLineItems.find((li) => li.id === item.id);
        if (existing) {
          return this.lineItemRepository.merge(existing, item as any);
        } else {
          return this.lineItemRepository.create(item as any);
        }
      });
      updateData.line_items = newLineItems;
    }

    this.invoiceRepository.merge(existingInvoice, updateData as DeepPartial<Invoice>);
    const calculatedInvoice = this.calculateTotals(existingInvoice);
    const updated = await this.invoiceRepository.save(calculatedInvoice);

    // Capture version with changes
    await this.auditService.captureVersion(updated, userId, 'Invoice updated', 'updated');

    // Invalidate cache
    await this.cacheService.invalidateInvoice(id);
    await this.cacheService.invalidateTenant(tenantId);

    // Metrics & Logging
    this.metricsService.recordInvoiceUpdated(tenantId);
    this.loggerService.info('Invoice updated', { invoice_id: id, tenant_id: tenantId });

    return updated;
  }

  // REMOVE
  async remove(id: string, tenantId: string): Promise<void> {
    const invoice = await this.findOne(id, tenantId);
    await this.invoiceRepository.remove(invoice);

    // Invalidate cache
    await this.cacheService.invalidateInvoice(id);
    await this.cacheService.invalidateTenant(tenantId);

    this.loggerService.info('Invoice deleted', { invoice_id: id, tenant_id: tenantId });
  }

  // COUNT by tenant
  async countByTenant(tenantId: string): Promise<number> {
    return this.invoiceRepository.count({ where: { tenant_id: tenantId } });
  }

  // Calculate totals
  private calculateTotals(invoice: Invoice): Invoice {
    const lineItems = invoice.line_items || [];

    let sub_total = 0;
    let total_tax_amount = 0;
    let total_discount_amount = 0;

    lineItems.forEach((item) => {
      const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemTax = itemSubtotal * ((item.tax_rate || 0) / 100);
      const itemDiscount = item.discount_amount || 0;

      item.line_total = itemSubtotal + itemTax - itemDiscount;
      item.tax_amount = itemTax;

      sub_total += itemSubtotal;
      total_tax_amount += itemTax;
      total_discount_amount += itemDiscount;
    });

    invoice.sub_total = sub_total;
    invoice.total_tax_amount = total_tax_amount;
    invoice.total_discount_amount = total_discount_amount;
    invoice.grand_total = sub_total + total_tax_amount - total_discount_amount;
    invoice.balance_due = invoice.grand_total - (invoice.amount_paid || 0);

    return invoice;
  }

  // Early payment discount
  async applyEarlyPaymentDiscount(
    id: string,
    discountPercentage: number,
    tenantId: string,
    userId: string,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    const discountAmount = (invoice.grand_total * discountPercentage) / 100;

    invoice.total_discount_amount += discountAmount;
    invoice.grand_total -= discountAmount;
    invoice.balance_due = invoice.grand_total - (invoice.amount_paid || 0);

    const updated = await this.invoiceRepository.save(invoice);

    // Capture version
    await this.auditService.captureVersion(
      updated,
      userId,
      `Applied ${discountPercentage}% early payment discount`,
      'updated',
    );

    // Invalidate cache
    await this.cacheService.invalidateInvoice(id);

    return updated;
  }
}
