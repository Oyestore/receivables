import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { SavedSearch } from '../entities/saved-search.entity';

export interface SearchFilters {
    status?: string[];
    client_ids?: string[];
    amount_min?: number;
    amount_max?: number;
    date_from?: Date;
    date_to?: Date;
    overdue_only?: boolean;
    payment_terms?: string[];
    tags?: string[];
    full_text?: string;
    recurring_only?: boolean;
    has_attachments?: boolean;
}

export interface SearchResult {
    invoices: Invoice[];
    total: number;
    facets: {
        statuses: { [key: string]: number };
        amount_ranges: { [key: string]: number };
    };
}

@Injectable()
export class AdvancedSearchService {
    constructor(
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
        @InjectRepository(SavedSearch)
        private savedSearchRepo: Repository<SavedSearch>,
    ) { }

    // Execute advanced search
    async search(
        filters: SearchFilters,
        pagination: { page: number; limit: number },
        tenantId: string,
    ): Promise<SearchResult> {
        const queryBuilder = this.invoiceRepo
            .createQueryBuilder('invoice')
            .where('invoice.tenant_id = :tenantId', { tenantId });

        // Apply filters
        this.applyFilters(queryBuilder, filters);

        // Get total count
        const total = await queryBuilder.getCount();

        // Apply pagination
        const skip = (pagination.page - 1) * pagination.limit;
        queryBuilder.skip(skip).take(pagination.limit);

        // Add sorting
        queryBuilder.orderBy('invoice.created_at', 'DESC');

        const invoices = await queryBuilder.getMany();

        // Calculate facets
        const facets = await this.calculateFacets(tenantId, filters);

        return {
            invoices,
            total,
            facets,
        };
    }

    // Apply filters to query builder
    private applyFilters(queryBuilder: any, filters: SearchFilters): void {
        // Status filter
        if (filters.status?.length) {
            queryBuilder.andWhere('invoice.status IN (:...statuses)', {
                statuses: filters.status,
            });
        }

        // Client filter
        if (filters.client_ids?.length) {
            queryBuilder.andWhere('invoice.client_id IN (:...clientIds)', {
                clientIds: filters.client_ids,
            });
        }

        // Amount range
        if (filters.amount_min !== undefined) {
            queryBuilder.andWhere('invoice.grand_total >= :minAmount', {
                minAmount: filters.amount_min,
            });
        }
        if (filters.amount_max !== undefined) {
            queryBuilder.andWhere('invoice.grand_total <= :maxAmount', {
                maxAmount: filters.amount_max,
            });
        }

        // Date range
        if (filters.date_from) {
            queryBuilder.andWhere('invoice.issue_date >= :dateFrom', {
                dateFrom: filters.date_from,
            });
        }
        if (filters.date_to) {
            queryBuilder.andWhere('invoice.issue_date <= :dateTo', {
                dateTo: filters.date_to,
            });
        }

        // Overdue only
        if (filters.overdue_only) {
            queryBuilder.andWhere('invoice.due_date < :now', { now: new Date() });
            queryBuilder.andWhere('invoice.status != :paidStatus', {
                paidStatus: 'paid',
            });
        }

        // Payment terms
        if (filters.payment_terms?.length) {
            queryBuilder.andWhere('invoice.payment_terms IN (:...terms)', {
                terms: filters.payment_terms,
            });
        }

        // Recurring only
        if (filters.recurring_only) {
            queryBuilder.andWhere('invoice.recurring_profile_id IS NOT NULL');
        }

        // Full-text search
        if (filters.full_text) {
            queryBuilder.andWhere(
                new Brackets((qb) => {
                    qb.where('invoice.number ILIKE :search', {
                        search: `%${filters.full_text}%`,
                    })
                        .orWhere('invoice.notes ILIKE :search', {
                            search: `%${filters.full_text}%`,
                        })
                        .orWhere('invoice.terms_conditions ILIKE :search', {
                            search: `%${filters.full_text}%`,
                        });
                }),
            );
        }
    }

    // Calculate search facets
    private async calculateFacets(
        tenantId: string,
        currentFilters: SearchFilters,
    ): Promise<any> {
        // Status counts
        const statusCounts = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .select('invoice.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .groupBy('invoice.status')
            .getRawMany();

        const statuses: { [key: string]: number } = {};
        statusCounts.forEach((row) => {
            statuses[row.status] = parseInt(row.count);
        });

        // Amount ranges
        const amountRanges: { [key: string]: number } = {
            '0-10000': 0,
            '10000-50000': 0,
            '50000-100000': 0,
            '100000+': 0,
        };

        const amountCounts = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .select(
                `CASE
          WHEN grand_total < 10000 THEN '0-10000'
          WHEN grand_total < 50000 THEN '10000-50000'
          WHEN grand_total < 100000 THEN '50000-100000'
          ELSE '100000+'
        END`,
                'range',
            )
            .addSelect('COUNT(*)', 'count')
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .groupBy('range')
            .getRawMany();

        amountCounts.forEach((row) => {
            amountRanges[row.range] = parseInt(row.count);
        });

        return { statuses, amount_ranges: amountRanges };
    }

    // Full-text search with autocomplete
    async fullTextSearch(
        query: string,
        tenantId: string,
        limit: number = 10,
    ): Promise<Invoice[]> {
        return this.invoiceRepo
            .createQueryBuilder('invoice')
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere(
                new Brackets((qb) => {
                    qb.where('invoice.number ILIKE :query', { query: `%${query}%` })
                        .orWhere('invoice.notes ILIKE :query', { query: `%${query}%` });
                }),
            )
            .take(limit)
            .getMany();
    }

    // Save search
    async saveSearch(
        name: string,
        filters: SearchFilters,
        userId: string,
        tenantId: string,
        description?: string,
    ): Promise<SavedSearch> {
        const search = this.savedSearchRepo.create({
            name,
            description,
            filters,
            user_id: userId,
            tenant_id: tenantId,
        });

        return this.savedSearchRepo.save(search);
    }

    // Get saved searches
    async getSavedSearches(
        userId: string,
        tenantId: string,
    ): Promise<SavedSearch[]> {
        return this.savedSearchRepo.find({
            where: [
                { user_id: userId, tenant_id: tenantId },
                { is_shared: true, tenant_id: tenantId },
            ],
            order: { usage_count: 'DESC', created_at: 'DESC' },
        });
    }

    // Execute saved search
    async executeSavedSearch(
        searchId: string,
        pagination: { page: number; limit: number },
        userId: string,
        tenantId: string,
    ): Promise<SearchResult> {
        const savedSearch = await this.savedSearchRepo.findOne({
            where: { id: searchId, tenant_id: tenantId },
        });

        if (!savedSearch) {
            throw new NotFoundException(`Saved search ${searchId} not found`);
        }

        // Increment usage count
        await this.savedSearchRepo.update(searchId, {
            usage_count: savedSearch.usage_count + 1,
            last_used_at: new Date(),
        });

        return this.search(savedSearch.filters, pagination, tenantId);
    }

    // Delete saved search
    async deleteSavedSearch(
        searchId: string,
        userId: string,
        tenantId: string,
    ): Promise<void> {
        const search = await this.savedSearchRepo.findOne({
            where: { id: searchId, user_id: userId, tenant_id: tenantId },
        });

        if (!search) {
            throw new NotFoundException(`Saved search ${searchId} not found`);
        }

        await this.savedSearchRepo.remove(search);
    }

    // Update saved search
    async updateSavedSearch(
        searchId: string,
        updates: { name?: string; description?: string; filters?: SearchFilters; is_favorite?: boolean },
        userId: string,
        tenantId: string,
    ): Promise<SavedSearch> {
        const search = await this.savedSearchRepo.findOne({
            where: { id: searchId, user_id: userId, tenant_id: tenantId },
        });

        if (!search) {
            throw new NotFoundException(`Saved search ${searchId} not found`);
        }

        Object.assign(search, updates);
        return this.savedSearchRepo.save(search);
    }

    // Search suggestions based on history
    async getSearchSuggestions(
        userId: string,
        tenantId: string,
    ): Promise<string[]> {
        const recentSearches = await this.savedSearchRepo.find({
            where: { user_id: userId, tenant_id: tenantId },
            order: { last_used_at: 'DESC' },
            take: 5,
        });

        return recentSearches.map((s) => s.name);
    }
}
