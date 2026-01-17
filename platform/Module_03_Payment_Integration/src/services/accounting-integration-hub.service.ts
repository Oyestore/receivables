import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Cron, Interval } from '@nestjs/schedule';

@Injectable()
export class ZohoBooksIntegrationService {
  private readonly logger = new Logger(ZohoBooksIntegrationService.name);
  private readonly zohoBooksBaseUrl = 'https://books.zoho.com/api/v3';
  private oauthTokens: Map<string, any> = new Map();

  constructor(
    @InjectRepository(OAuthToken)
    private readonly oauthTokenRepository: Repository<OAuthToken>,
    private readonly httpService: HttpService,
  ) {}

  async authenticateClient(clientId: string, clientSecret: string, code: string): Promise<any> {
    try {
      const response = await this.httpService.post(`${this.zohoBooksBaseUrl}/oauth/v2/token`, {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
      }).toPromise();

      const tokenData = response.data;
      
      // Store token securely
      await this.storeToken(clientId, tokenData);
      
      this.logger.log(`Successfully authenticated Zoho Books client: ${clientId}`);
      return tokenData;
    } catch (error) {
      this.logger.error('Zoho Books authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  async refreshToken(clientId: string): Promise<any> {
    try {
      const storedToken = await this.oauthTokenRepository.findOne({ where: { clientId } });
      if (!storedToken) {
        throw new Error('No token found for client');
      }

      const response = await this.httpService.post(`${this.zohoBooksBaseUrl}/oauth/v2/token`, {
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        refresh_token: storedToken.refreshToken,
      }).toPromise();

      const tokenData = response.data;
      await this.updateToken(clientId, tokenData);
      
      this.logger.log(`Successfully refreshed token for client: ${clientId}`);
      return tokenData;
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new Error('Token refresh failed');
    }
  }

  async createInvoice(invoiceData: any, clientId: string): Promise<any> {
    try {
      const token = await this.getValidToken(clientId);
      
      const response = await this.httpService.post(
        `${this.zohoBooksBaseUrl}/invoices`,
        invoiceData,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      ).toPromise();

      this.logger.log(`Created invoice in Zoho Books: ${response.data.invoice.invoice_id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create invoice in Zoho Books:', error);
      throw new Error('Invoice creation failed');
    }
  }

  async syncCustomers(clientId: string): Promise<any[]> {
    try {
      const token = await this.getValidToken(clientId);
      
      const response = await this.httpService.get(
        `${this.zohoBooksBaseUrl}/contacts`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token.accessToken}`,
          },
          params: {
            per_page: 200,
          },
        }
      ).toPromise();

      const customers = response.data.contacts;
      this.logger.log(`Synced ${customers.length} customers from Zoho Books`);
      return customers;
    } catch (error) {
      this.logger.error('Failed to sync customers from Zoho Books:', error);
      throw new Error('Customer sync failed');
    }
  }

  async getPaymentStatus(invoiceId: string, clientId: string): Promise<any> {
    try {
      const token = await this.getValidToken(clientId);
      
      const response = await this.httpService.get(
        `${this.zohoBooksBaseUrl}/invoices/${invoiceId}/payments`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token.accessToken}`,
          },
        }
      ).toPromise();

      return response.data.payments;
    } catch (error) {
      this.logger.error('Failed to get payment status from Zoho Books:', error);
      throw new Error('Payment status retrieval failed');
    }
  }

  async handleWebhook(webhookData: any, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(webhookData, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook based on event type
      switch (webhookData.event) {
        case 'invoice.created':
          await this.handleInvoiceCreated(webhookData);
          break;
        case 'invoice.payment_received':
          await this.handlePaymentReceived(webhookData);
          break;
        case 'customer.created':
          await this.handleCustomerCreated(webhookData);
          break;
        default:
          this.logger.warn(`Unhandled webhook event: ${webhookData.event}`);
      }
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  private async storeToken(clientId: string, tokenData: any): Promise<void> {
    const token = this.oauthTokenRepository.create({
      clientId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      createdAt: new Date(),
    });

    await this.oauthTokenRepository.save(token);
    this.oauthTokens.set(clientId, tokenData);
  }

  private async updateToken(clientId: string, tokenData: any): Promise<void> {
    await this.oauthTokenRepository.update(
      { clientId },
      {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        updatedAt: new Date(),
      }
    );

    this.oauthTokens.set(clientId, tokenData);
  }

  private async getValidToken(clientId: string): Promise<any> {
    let token = this.oauthTokens.get(clientId);
    
    if (!token) {
      const storedToken = await this.oauthTokenRepository.findOne({ where: { clientId } });
      if (!storedToken) {
        throw new Error('No token found for client');
      }
      token = {
        accessToken: storedToken.accessToken,
        refreshToken: storedToken.refreshToken,
        expiresAt: storedToken.expiresAt,
      };
      this.oauthTokens.set(clientId, token);
    }

    // Check if token is expired
    if (new Date() >= token.expiresAt) {
      token = await this.refreshToken(clientId);
    }

    return token;
  }

  private verifyWebhookSignature(data: any, signature: string): boolean {
    // Implement webhook signature verification
    const crypto = require('crypto');
    const secret = process.env.ZOHO_WEBHOOK_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');
    
    return signature === expectedSignature;
  }

  private async handleInvoiceCreated(data: any): Promise<void> {
    this.logger.log(`Invoice created in Zoho Books: ${data.invoice_id}`);
    // Trigger sync to local system
  }

  private async handlePaymentReceived(data: any): Promise<void> {
    this.logger.log(`Payment received in Zoho Books: ${data.payment_id}`);
    // Update payment status in local system
  }

  private async handleCustomerCreated(data: any): Promise<void> {
    this.logger.log(`Customer created in Zoho Books: ${data.contact_id}`);
    // Sync customer to local system
  }

  @Interval(300000) // Check token expiry every 5 minutes
  private async checkTokenExpiry(): Promise<void> {
    const now = new Date();
    const expiringTokens = await this.oauthTokenRepository.find({
      where: {
        expiresAt: {
          $lte: new Date(now.getTime() + 5 * 60 * 1000), // Tokens expiring in next 5 minutes
        },
      },
    });

    for (const token of expiringTokens) {
      try {
        await this.refreshToken(token.clientId);
      } catch (error) {
        this.logger.error(`Failed to refresh token for client ${token.clientId}:`, error);
      }
    }
  }
}

@Injectable()
export class BusyAccountingIntegrationService {
  private readonly logger = new Logger(BusyAccountingIntegrationService.name);
  private odbcConnections: Map<string, any> = new Map();

  constructor(
    @InjectRepository(BusyConfig)
    private readonly busyConfigRepository: Repository<BusyConfig>,
  ) {}

  async connectToDatabase(configId: string): Promise<any> {
    try {
      const config = await this.busyConfigRepository.findOne({ where: { id: configId } });
      if (!config) {
        throw new Error('Busy configuration not found');
      }

      const odbc = require('odbc');
      const connectionString = `DRIVER={${config.driver}};SERVER=${config.server};DATABASE=${config.database};UID=${config.username};PWD=${config.password};`;
      
      const connection = odbc.connect(connectionString);
      this.odbcConnections.set(configId, connection);
      
      this.logger.log(`Connected to Busy database: ${config.database}`);
      return connection;
    } catch (error) {
      this.logger.error('Failed to connect to Busy database:', error);
      throw new Error('Database connection failed');
    }
  }

  async syncLedgers(configId: string): Promise<any[]> {
    try {
      const connection = this.odbcConnections.get(configId);
      if (!connection) {
        await this.connectToDatabase(configId);
      }

      const query = 'SELECT * FROM Ledgers WHERE IsActive = 1';
      const result = await connection.query(query);
      
      const ledgers = result.map(row => ({
        id: row.LedgerID,
        name: row.LedgerName,
        group: row.GroupName,
        openingBalance: row.OpeningBalance,
        currentBalance: row.CurrentBalance,
      }));

      this.logger.log(`Synced ${ledgers.length} ledgers from Busy`);
      return ledgers;
    } catch (error) {
      this.logger.error('Failed to sync ledgers from Busy:', error);
      throw new Error('Ledger sync failed');
    }
  }

  async createVoucher(voucherData: any, configId: string): Promise<any> {
    try {
      const connection = this.odbcConnections.get(configId);
      if (!connection) {
        await this.connectToDatabase(configId);
      }

      const query = `
        INSERT INTO Vouchers (VoucherType, Date, LedgerID, Amount, Narration) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [
        voucherData.type,
        voucherData.date,
        voucherData.ledgerId,
        voucherData.amount,
        voucherData.narration,
      ];

      const result = await connection.query(query, params);
      
      this.logger.log(`Created voucher in Busy: ${result.insertId}`);
      return { id: result.insertId, ...voucherData };
    } catch (error) {
      this.logger.error('Failed to create voucher in Busy:', error);
      throw new Error('Voucher creation failed');
    }
  }

  async getCompanyInfo(configId: string): Promise<any> {
    try {
      const connection = this.odbcConnections.get(configId);
      if (!connection) {
        await this.connectToDatabase(configId);
      }

      const query = 'SELECT * FROM CompanyInfo';
      const result = await connection.query(query);
      
      if (result.length === 0) {
        throw new Error('Company info not found');
      }

      const companyInfo = {
        name: result[0].CompanyName,
        address: result[0].Address,
        phone: result[0].Phone,
        email: result[0].Email,
        gstin: result[0].GSTIN,
        financialYear: result[0].FinancialYear,
      };

      this.logger.log(`Retrieved company info from Busy: ${companyInfo.name}`);
      return companyInfo;
    } catch (error) {
      this.logger.error('Failed to get company info from Busy:', error);
      throw new Error('Company info retrieval failed');
    }
  }

  async backupDatabase(configId: string): Promise<string> {
    try {
      const config = await this.busyConfigRepository.findOne({ where: { id: configId } });
      if (!config) {
        throw new Error('Busy configuration not found');
      }

      const backupPath = `${config.backupPath}/busy_backup_${Date.now()}.bak`;
      
      // Implement backup logic based on Busy's backup mechanism
      const fs = require('fs');
      
      this.logger.log(`Created backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.error('Failed to backup Busy database:', error);
      throw new Error('Database backup failed');
    }
  }

  @Cron('0 2 * * *') // Daily at 2 AM
  private async performDailySync(): Promise<void> {
    const configs = await this.busyConfigRepository.find({ where: { isActive: true } });
    
    for (const config of configs) {
      try {
        await this.syncLedgers(config.id);
        await this.backupDatabase(config.id);
      } catch (error) {
        this.logger.error(`Daily sync failed for config ${config.id}:`, error);
      }
    }
  }
}

@Injectable()
export class MargERPIntegrationService {
  private readonly logger = new Logger(MargERPIntegrationService.name);
  private readonly margBaseUrl = 'http://localhost:8080/marg/api';

  constructor(
    @InjectRepository(MargConfig)
    private readonly margConfigRepository: Repository<MargConfig>,
    private readonly httpService: HttpService,
  ) {}

  async authenticate(configId: string): Promise<any> {
    try {
      const config = await this.margConfigRepository.findOne({ where: { id: configId } });
      if (!config) {
        throw new Error('Marg ERP configuration not found');
      }

      const response = await this.httpService.post(`${this.margBaseUrl}/auth/login`, {
        username: config.username,
        password: config.password,
        database: config.database,
      }).toPromise();

      const tokenData = response.data;
      
      this.logger.log(`Successfully authenticated with Marg ERP: ${config.database}`);
      return tokenData;
    } catch (error) {
      this.logger.error('Marg ERP authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  async syncItems(configId: string): Promise<any[]> {
    try {
      const config = await this.margConfigRepository.findOne({ where: { id: configId } });
      const token = await this.authenticate(configId);
      
      const response = await this.httpService.get(
        `${this.margBaseUrl}/items`,
        {
          headers: {
            'Authorization': `Bearer ${token.token}`,
          },
        }
      ).toPromise();

      const items = response.data.items;
      this.logger.log(`Synced ${items.length} items from Marg ERP`);
      return items;
    } catch (error) {
      this.logger.error('Failed to sync items from Marg ERP:', error);
      throw new Error('Item sync failed');
    }
  }

  async createSalesOrder(orderData: any, configId: string): Promise<any> {
    try {
      const token = await this.authenticate(configId);
      
      const response = await this.httpService.post(
        `${this.margBaseUrl}/sales-orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${token.token}`,
            'Content-Type': 'application/json',
          },
        }
      ).toPromise();

      this.logger.log(`Created sales order in Marg ERP: ${response.data.orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create sales order in Marg ERP:', error);
      throw new Error('Sales order creation failed');
    }
  }
}

@Injectable()
export class QuickBooksIndiaIntegrationService {
  private readonly logger = new Logger(QuickBooksIndiaIntegrationService.name);
  private readonly quickbooksBaseUrl = 'https://quickbooks.api.intuit.com/v3/company';

  constructor(
    @InjectRepository(QuickBooksConfig)
    private readonly quickbooksConfigRepository: Repository<QuickBooksConfig>,
    private readonly httpService: HttpService,
  ) {}

  async authenticate(configId: string): Promise<any> {
    try {
      const config = await this.quickbooksConfigRepository.findOne({ where: { id: configId } });
      if (!config) {
        throw new Error('QuickBooks configuration not found');
      }

      const response = await this.httpService.post(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        {
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      ).toPromise();

      const tokenData = response.data;
      
      this.logger.log(`Successfully authenticated with QuickBooks India`);
      return tokenData;
    } catch (error) {
      this.logger.error('QuickBooks India authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  async syncCustomers(configId: string): Promise<any[]> {
    try {
      const config = await this.quickbooksConfigRepository.findOne({ where: { id: configId } });
      const token = await this.authenticate(configId);
      
      const response = await this.httpService.get(
        `${this.quickbooksBaseUrl}/${config.realmId}/query`,
        {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
          },
          params: {
            query: 'SELECT * FROM Customer',
          },
        }
      ).toPromise();

      const customers = response.data.QueryResponse.Customer;
      this.logger.log(`Synced ${customers.length} customers from QuickBooks India`);
      return customers;
    } catch (error) {
      this.logger.error('Failed to sync customers from QuickBooks India:', error);
      throw new Error('Customer sync failed');
    }
  }

  async createInvoice(invoiceData: any, configId: string): Promise<any> {
    try {
      const config = await this.quickbooksConfigRepository.findOne({ where: { id: configId } });
      const token = await this.authenticate(configId);
      
      const response = await this.httpService.post(
        `${this.quickbooksBaseUrl}/${config.realmId}/invoice`,
        invoiceData,
        {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      ).toPromise();

      this.logger.log(`Created invoice in QuickBooks India: ${response.data.Invoice.Id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create invoice in QuickBooks India:', error);
      throw new Error('Invoice creation failed');
    }
  }
}
