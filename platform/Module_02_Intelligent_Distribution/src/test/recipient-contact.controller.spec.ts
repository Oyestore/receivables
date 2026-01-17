import { Test, TestingModule } from '@nestjs/testing';
import { RecipientContactController } from '../controllers/recipient-contact.controller';
import { RecipientContactService } from '../services/recipient-contact.service';
import { CreateRecipientContactDto } from '../dto/create-recipient-contact.dto';
import { UpdateRecipientContactDto } from '../dto/update-recipient-contact.dto';
import { DistributionChannel, ContactStatus } from '../entities/distribution-entities';
import { HttpStatus } from '@nestjs/common';

describe('RecipientContactController - Complete Tests', () => {
  let controller: RecipientContactController;
  let contactService: RecipientContactService;

  const mockContact = {
    id: 'contact-1',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    contactName: 'John Doe',
    contactType: 'primary',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    whatsapp: '+1234567890',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
    },
    preferences: {
      preferredChannel: DistributionChannel.EMAIL,
      timezone: 'America/New_York',
      language: 'en',
      doNotDisturb: false,
    },
    status: ContactStatus.ACTIVE,
    metadata: {
      source: 'manual',
      verified: true,
      lastVerified: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipientContactController],
      providers: [
        {
          provide: RecipientContactService,
          useValue: {
            createRecipientContact: jest.fn(),
            getRecipientContactById: jest.fn(),
            updateRecipientContact: jest.fn(),
            deleteRecipientContact: jest.fn(),
            listRecipientContacts: jest.fn(),
            getContactsByCustomerId: jest.fn(),
            validateContact: jest.fn(),
            updateContactPreferences: jest.fn(),
            bulkUpdateContacts: jest.fn(),
            searchContacts: jest.fn(),
            getContactStatistics: jest.fn(),
            exportContacts: jest.fn(),
            importContacts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecipientContactController>(RecipientContactController);
    contactService = module.get<RecipientContactService>(RecipientContactService);
  });

  describe('Recipient Contacts Management', () => {
    it('should create a new recipient contact', async () => {
      const createContactDto: CreateRecipientContactDto = {
        customerId: 'customer-1',
        contactName: 'John Doe',
        contactType: 'primary',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        whatsapp: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001',
        },
        preferences: {
          preferredChannel: DistributionChannel.EMAIL,
          timezone: 'America/New_York',
          language: 'en',
          doNotDisturb: false,
        },
      };

      jest.spyOn(contactService, 'createRecipientContact').mockResolvedValue(mockContact);

      const result = await controller.createRecipientContact(createContactDto, { user: { id: 'user-1', tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContact);
      expect(contactService.createRecipientContact).toHaveBeenCalledWith(createContactDto, 'user-1', 'tenant-1');
    });

    it('should get recipient contact by ID', async () => {
      jest.spyOn(contactService, 'getRecipientContactById').mockResolvedValue(mockContact);

      const result = await controller.getRecipientContact('contact-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContact);
      expect(contactService.getRecipientContactById).toHaveBeenCalledWith('contact-1', 'tenant-1');
    });

    it('should update recipient contact', async () => {
      const updateData: UpdateRecipientContactDto = {
        contactName: 'John Smith',
        email: 'john.smith@example.com',
        preferences: {
          preferredChannel: DistributionChannel.SMS,
          timezone: 'America/Los_Angeles',
        },
      };

      const updatedContact = { ...mockContact, ...updateData };

      jest.spyOn(contactService, 'updateRecipientContact').mockResolvedValue(updatedContact);

      const result = await controller.updateRecipientContact('contact-1', updateData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.contactName).toBe('John Smith');
      expect(result.data.preferences.preferredChannel).toBe(DistributionChannel.SMS);
    });

    it('should delete recipient contact', async () => {
      jest.spyOn(contactService, 'deleteRecipientContact').mockResolvedValue(undefined);

      const result = await controller.deleteRecipientContact('contact-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(contactService.deleteRecipientContact).toHaveBeenCalledWith('contact-1', 'tenant-1');
    });

    it('should list recipient contacts with filters', async () => {
      const contacts = [mockContact];
      const query = {
        customerId: 'customer-1',
        status: ContactStatus.ACTIVE,
        preferredChannel: DistributionChannel.EMAIL,
        page: 1,
        limit: 10,
      };

      jest.spyOn(contactService, 'listRecipientContacts').mockResolvedValue(contacts);

      const result = await controller.listRecipientContacts(query, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(contacts);
      expect(contactService.listRecipientContacts).toHaveBeenCalledWith('tenant-1', query);
    });
  });

  describe('Customer Contact Operations', () => {
    it('should get contacts by customer ID', async () => {
      const customerContacts = [mockContact];
      jest.spyOn(contactService, 'getContactsByCustomerId').mockResolvedValue(customerContacts);

      const result = await controller.getContactsByCustomerId('customer-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(customerContacts);
      expect(contactService.getContactsByCustomerId).toHaveBeenCalledWith('customer-1', 'tenant-1');
    });

    it('should get primary contact for customer', async () => {
      const primaryContact = { ...mockContact, contactType: 'primary' };
      jest.spyOn(contactService, 'getPrimaryContactByCustomerId').mockResolvedValue(primaryContact);

      const result = await controller.getPrimaryContact('customer-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.contactType).toBe('primary');
    });

    it('should get all contact channels for customer', async () => {
      const channels = [
        { channel: DistributionChannel.EMAIL, value: 'john@example.com', verified: true },
        { channel: DistributionChannel.SMS, value: '+1234567890', verified: true },
        { channel: DistributionChannel.WHATSAPP, value: '+1234567890', verified: false },
      ];

      jest.spyOn(contactService, 'getContactChannelsByCustomerId').mockResolvedValue(channels);

      const result = await controller.getContactChannels('customer-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].channel).toBe(DistributionChannel.EMAIL);
    });
  });

  describe('Contact Validation', () => {
    it('should validate contact information', async () => {
      const validationResult = {
        isValid: true,
        validatedFields: {
          email: { valid: true, message: 'Valid email format' },
          phone: { valid: true, message: 'Valid phone format' },
          whatsapp: { valid: true, message: 'Valid WhatsApp number' },
        },
        recommendations: [
          'Consider verifying WhatsApp number',
          'Add postal address for mail delivery',
        ],
      };

      jest.spyOn(contactService, 'validateContact').mockResolvedValue(validationResult);

      const result = await controller.validateContact('contact-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.validatedFields.email.valid).toBe(true);
    });

    it('should handle validation errors', async () => {
      const validationResult = {
        isValid: false,
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'phone', message: 'Invalid phone number' },
        ],
        recommendations: [
          'Correct email format',
          'Add country code to phone number',
        ],
      };

      jest.spyOn(contactService, 'validateContact').mockResolvedValue(validationResult);

      const result = await controller.validateContact('contact-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors).toHaveLength(2);
    });

    it('should verify contact information', async () => {
      const verificationResult = {
        verified: true,
        verificationMethod: 'email',
        verifiedAt: new Date(),
        verificationCode: '123456',
      };

      jest.spyOn(contactService, 'verifyContact').mockResolvedValue(verificationResult);

      const result = await controller.verifyContact('contact-1', { method: 'email' }, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.verified).toBe(true);
      expect(result.data.verificationMethod).toBe('email');
    });
  });

  describe('Contact Preferences', () => {
    it('should update contact preferences', async () => {
      const preferences = {
        preferredChannel: DistributionChannel.SMS,
        timezone: 'America/Los_Angeles',
        language: 'es',
        doNotDisturb: true,
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'America/Los_Angeles',
        },
      };

      const updatedContact = {
        ...mockContact,
        preferences: { ...mockContact.preferences, ...preferences },
      };

      jest.spyOn(contactService, 'updateContactPreferences').mockResolvedValue(updatedContact);

      const result = await controller.updateContactPreferences('contact-1', preferences, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.preferences.preferredChannel).toBe(DistributionChannel.SMS);
      expect(result.data.preferences.doNotDisturb).toBe(true);
    });

    it('should get contact preferences', async () => {
      jest.spyOn(contactService, 'getContactPreferences').mockResolvedValue(mockContact.preferences);

      const result = await controller.getContactPreferences('contact-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContact.preferences);
      expect(result.data.preferredChannel).toBe(DistributionChannel.EMAIL);
    });

    it('should handle do not disturb preferences', async () => {
      const dndResult = {
        doNotDisturb: true,
        reason: 'User requested',
        until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      jest.spyOn(contactService, 'setDoNotDisturb').mockResolvedValue(dndResult);

      const result = await controller.setDoNotDisturb('contact-1', { enabled: true, reason: 'User requested', days: 7 }, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.doNotDisturb).toBe(true);
      expect(result.data.reason).toBe('User requested');
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update contacts', async () => {
      const bulkUpdate = {
        contactIds: ['contact-1', 'contact-2', 'contact-3'],
        updateData: {
          preferences: {
            preferredChannel: DistributionChannel.EMAIL,
            timezone: 'UTC',
          },
        },
      };

      const updateResults = {
        total: 3,
        successful: 2,
        failed: 1,
        results: [
          { contactId: 'contact-1', success: true },
          { contactId: 'contact-2', success: true },
          { contactId: 'contact-3', success: false, error: 'Contact not found' },
        ],
      };

      jest.spyOn(contactService, 'bulkUpdateContacts').mockResolvedValue(updateResults);

      const result = await controller.bulkUpdateContacts(bulkUpdate, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateResults);
      expect(result.data.successful).toBe(2);
      expect(result.data.failed).toBe(1);
    });

    it('should bulk delete contacts', async () => {
      const bulkDelete = {
        contactIds: ['contact-1', 'contact-2'],
        reason: 'Customer request',
      };

      const deleteResults = {
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          { contactId: 'contact-1', success: true },
          { contactId: 'contact-2', success: true },
        ],
      };

      jest.spyOn(contactService, 'bulkDeleteContacts').mockResolvedValue(deleteResults);

      const result = await controller.bulkDeleteContacts(bulkDelete, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.successful).toBe(2);
      expect(result.data.failed).toBe(0);
    });
  });

  describe('Search and Filter Operations', () => {
    it('should search contacts by name', async () => {
      const searchResults = [mockContact];
      jest.spyOn(contactService, 'searchContacts').mockResolvedValue(searchResults);

      const result = await controller.searchContacts({ query: 'John', field: 'name' }, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(searchResults);
      expect(contactService.searchContacts).toHaveBeenCalledWith('tenant-1', { query: 'John', field: 'name' });
    });

    it('should search contacts by email', async () => {
      const searchResults = [mockContact];
      jest.spyOn(contactService, 'searchContacts').mockResolvedValue(searchResults);

      const result = await controller.searchContacts({ query: 'john@example.com', field: 'email' }, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(searchResults);
    });

    it('should search contacts by phone', async () => {
      const searchResults = [mockContact];
      jest.spyOn(contactService, 'searchContacts').mockResolvedValue(searchResults);

      const result = await controller.searchContacts({ query: '+1234567890', field: 'phone' }, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(searchResults);
    });

    it('should filter contacts by channel preference', async () => {
      const filteredContacts = [mockContact];
      jest.spyOn(contactService, 'filterContactsByChannel').mockResolvedValue(filteredContacts);

      const result = await controller.filterContactsByChannel(DistributionChannel.EMAIL, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(filteredContacts);
    });

    it('should filter contacts by status', async () => {
      const filteredContacts = [mockContact];
      jest.spyOn(contactService, 'filterContactsByStatus').mockResolvedValue(filteredContacts);

      const result = await controller.filterContactsByStatus(ContactStatus.ACTIVE, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(filteredContacts);
    });
  });

  describe('Analytics and Statistics', () => {
    it('should get contact statistics', async () => {
      const statistics = {
        totalContacts: 1000,
        activeContacts: 850,
        inactiveContacts: 150,
        verifiedContacts: 700,
        unverifiedContacts: 300,
        channelBreakdown: {
          [DistributionChannel.EMAIL]: 600,
          [DistributionChannel.SMS]: 250,
          [DistributionChannel.WHATSAPP]: 150,
        },
        timezoneBreakdown: {
          'America/New_York': 300,
          'America/Los_Angeles': 250,
          'Europe/London': 200,
          'Asia/Tokyo': 250,
        },
      };

      jest.spyOn(contactService, 'getContactStatistics').mockResolvedValue(statistics);

      const result = await controller.getContactStatistics({ user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(statistics);
      expect(result.data.totalContacts).toBe(1000);
      expect(result.data.channelBreakdown[DistributionChannel.EMAIL]).toBe(600);
    });

    it('should get contact engagement metrics', async () => {
      const engagementMetrics = {
        totalContacts: 1000,
        engagedContacts: 750,
        engagementRate: 0.75,
        averageResponseTime: 2.5,
        channelEngagement: {
          [DistributionChannel.EMAIL]: { sent: 500, opened: 400, clicked: 100, rate: 0.8 },
          [DistributionChannel.SMS]: { sent: 300, delivered: 280, responded: 140, rate: 0.5 },
          [DistributionChannel.WHATSAPP]: { sent: 200, delivered: 190, read: 150, rate: 0.79 },
        },
        timeBasedEngagement: {
          last7Days: 0.8,
          last30Days: 0.75,
          last90Days: 0.7,
        },
      };

      jest.spyOn(contactService, 'getContactEngagementMetrics').mockResolvedValue(engagementMetrics);

      const result = await controller.getContactEngagementMetrics({ user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(engagementMetrics);
      expect(result.data.engagementRate).toBe(0.75);
    });
  });

  describe('Import and Export Operations', () => {
    it('should export contacts to CSV', async () => {
      const exportData = {
        format: 'csv',
        data: 'id,contactName,email,phone\ncontact-1,John Doe,john@example.com,+1234567890',
        filename: 'contacts_export.csv',
        exportedAt: new Date(),
        recordCount: 1,
      };

      jest.spyOn(contactService, 'exportContacts').mockResolvedValue(exportData);

      const result = await controller.exportContacts({ format: 'csv', filters: { status: ContactStatus.ACTIVE } }, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(exportData);
      expect(result.data.format).toBe('csv');
      expect(result.data.recordCount).toBe(1);
    });

    it('should import contacts from CSV', async () => {
      const importData = {
        format: 'csv',
        data: 'contactName,email,phone\nJane Smith,jane@example.com,+1234567891',
        filename: 'contacts_import.csv',
        importedAt: new Date(),
      };

      const importResult = {
        total: 1,
        successful: 1,
        failed: 0,
        duplicates: 0,
        results: [
          { row: 2, contactId: 'contact-2', success: true, contactName: 'Jane Smith' },
        ],
      };

      jest.spyOn(contactService, 'importContacts').mockResolvedValue(importResult);

      const result = await controller.importContacts(importData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(importResult);
      expect(result.data.successful).toBe(1);
    });

    it('should handle import validation errors', async () => {
      const importData = {
        format: 'csv',
        data: 'contactName,email,phone\nInvalid Email,invalid-email,invalid-phone',
        filename: 'contacts_import.csv',
        importedAt: new Date(),
      };

      const importResult = {
        total: 1,
        successful: 0,
        failed: 1,
        duplicates: 0,
        results: [
          { row: 2, success: false, errors: ['Invalid email format', 'Invalid phone format'] },
        ],
      };

      jest.spyOn(contactService, 'importContacts').mockResolvedValue(importResult);

      const result = await controller.importContacts(importData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.failed).toBe(1);
      expect(result.data.results[0].errors).toHaveLength(2);
    });
  });

  describe('Contact Merging', () => {
    it('should merge duplicate contacts', async () => {
      const mergeData = {
        primaryContactId: 'contact-1',
        duplicateContactIds: ['contact-2', 'contact-3'],
        mergeStrategy: 'primary_wins',
      };

      const mergeResult = {
        mergedContact: {
          ...mockContact,
          mergedFrom: ['contact-2', 'contact-3'],
        },
        duplicatesRemoved: 2,
        mergeConflicts: [],
      };

      jest.spyOn(contactService, 'mergeDuplicateContacts').mockResolvedValue(mergeResult);

      const result = await controller.mergeDuplicateContacts(mergeData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mergeResult);
      expect(result.data.duplicatesRemoved).toBe(2);
    });

    it('should identify potential duplicate contacts', async () => {
      const potentialDuplicates = [
        {
          contactId: 'contact-2',
          similarityScore: 0.95,
          matchingFields: ['email', 'phone'],
          contact: { ...mockContact, id: 'contact-2', email: 'john.doe+1@example.com' },
        },
        {
          contactId: 'contact-3',
          similarityScore: 0.85,
          matchingFields: ['phone'],
          contact: { ...mockContact, id: 'contact-3', phone: '+1234567891' },
        },
      ];

      jest.spyOn(contactService, 'findPotentialDuplicates').mockResolvedValue(potentialDuplicates);

      const result = await controller.findPotentialDuplicates('contact-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].similarityScore).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    it('should handle contact not found error', async () => {
      const error = new Error('Recipient contact not found');
      jest.spyOn(contactService, 'getRecipientContactById').mockRejectedValue(error);

      const result = await controller.getRecipientContact('invalid-id', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipient contact not found');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        customerId: '',
        contactName: '',
        email: 'invalid-email',
        phone: 'invalid-phone',
      };

      const result = await controller.createRecipientContact(invalidData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should handle duplicate contact error', async () => {
      const error = new Error('Contact with this email already exists');
      jest.spyOn(contactService, 'createRecipientContact').mockRejectedValue(error);

      const result = await controller.createRecipientContact(mockContact, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should handle service unavailability', async () => {
      const error = new Error('Contact service temporarily unavailable');
      jest.spyOn(contactService, 'listRecipientContacts').mockRejectedValue(error);

      const result = await controller.listRecipientContacts({}, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('service temporarily unavailable');
    });
  });

  describe('Authorization Tests', () => {
    it('should allow admin to access all contacts', async () => {
      const adminUser = { id: 'admin-1', tenantId: 'tenant-1', role: 'admin' };
      jest.spyOn(contactService, 'getRecipientContactById').mockResolvedValue(mockContact);

      const result = await controller.getRecipientContact('contact-1', { user: adminUser });

      expect(result.success).toBe(true);
    });

    it('should restrict access based on tenant', async () => {
      const otherTenantUser = { id: 'user-2', tenantId: 'other-tenant' };
      jest.spyOn(contactService, 'getRecipientContactById').mockRejectedValue(new Error('Access denied'));

      const result = await controller.getRecipientContact('contact-1', { user: otherTenantUser });

      expect(result.success).toBe(false);
    });

    it('should allow users to access their customer contacts', async () => {
      const regularUser = { id: 'user-1', tenantId: 'tenant-1', customerId: 'customer-1' };
      jest.spyOn(contactService, 'getRecipientContactById').mockResolvedValue(mockContact);

      const result = await controller.getRecipientContact('contact-1', { user: regularUser });

      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent contact requests efficiently', async () => {
      const requests = Array.from({ length: 20 }, () =>
        controller.getRecipientContact('contact-1', { user: { tenantId: 'tenant-1' } })
      );

      jest.spyOn(contactService, 'getRecipientContactById').mockResolvedValue(mockContact);

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large contact lists efficiently', async () => {
      const largeContactList = Array.from({ length: 100 }, (_, i) => ({
        ...mockContact,
        id: `contact-${i}`,
        email: `contact${i}@example.com`,
      }));

      jest.spyOn(contactService, 'listRecipientContacts').mockResolvedValue(largeContactList);

      const startTime = Date.now();
      const result = await controller.listRecipientContacts({ limit: 100 }, { user: { tenantId: 'tenant-1' } });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle bulk operations efficiently', async () => {
      const bulkUpdate = {
        contactIds: Array.from({ length: 50 }, (_, i) => `contact-${i}`),
        updateData: { preferences: { preferredChannel: DistributionChannel.EMAIL } },
      };

      const bulkResults = {
        total: 50,
        successful: 50,
        failed: 0,
        results: Array.from({ length: 50 }, (_, i) => ({
          contactId: `contact-${i}`,
          success: true,
        })),
      };

      jest.spyOn(contactService, 'bulkUpdateContacts').mockResolvedValue(bulkResults);

      const startTime = Date.now();
      const result = await controller.bulkUpdateContacts(bulkUpdate, { user: { tenantId: 'tenant-1' } });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data.successful).toBe(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields in create contact', async () => {
      const invalidContact = {
        customerId: '',
        contactName: '',
        email: 'invalid-email',
        phone: 'invalid-phone',
      };

      const result = await controller.createRecipientContact(invalidContact, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate email format', async () => {
      const invalidContact = {
        customerId: 'customer-1',
        contactName: 'John Doe',
        email: 'invalid-email-format',
        phone: '+1234567890',
      };

      const result = await controller.createRecipientContact(invalidContact, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should validate phone number format', async () => {
      const invalidContact = {
        customerId: 'customer-1',
        contactName: 'John Doe',
        email: 'john@example.com',
        phone: 'invalid-phone-number',
      };

      const result = await controller.createRecipientContact(invalidContact, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('phone');
    });

    it('should validate timezone format', async () => {
      const invalidPreferences = {
        preferredChannel: DistributionChannel.EMAIL,
        timezone: 'invalid-timezone',
        language: 'en',
      };

      const result = await controller.updateContactPreferences('contact-1', invalidPreferences, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timezone');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with distribution service for channel validation', async () => {
      const contactWithChannels = {
        ...mockContact,
        availableChannels: [DistributionChannel.EMAIL, DistributionChannel.SMS],
        validatedChannels: {
          [DistributionChannel.EMAIL]: { valid: true, verified: true },
          [DistributionChannel.SMS]: { valid: true, verified: false },
        },
      };

      jest.spyOn(contactService, 'getRecipientContactById').mockResolvedValue(contactWithChannels);

      const result = await controller.getRecipientContact('contact-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.availableChannels).toContain(DistributionChannel.EMAIL);
    });

    it('should handle contact lifecycle from creation to deletion', async () => {
      // Create contact
      jest.spyOn(contactService, 'createRecipientContact').mockResolvedValue(mockContact);
      const createdResult = await controller.createRecipientContact(mockContact, { user: { tenantId: 'tenant-1' } });
      expect(createdResult.success).toBe(true);

      // Update contact
      const updateData = { contactName: 'John Smith' };
      jest.spyOn(contactService, 'updateRecipientContact').mockResolvedValue({ ...mockContact, ...updateData });
      const updatedResult = await controller.updateRecipientContact('contact-1', updateData, { user: { tenantId: 'tenant-1' } });
      expect(updatedResult.success).toBe(true);

      // Delete contact
      jest.spyOn(contactService, 'deleteRecipientContact').mockResolvedValue(undefined);
      const deletedResult = await controller.deleteRecipientContact('contact-1', { user: { tenantId: 'tenant-1' } });
      expect(deletedResult.success).toBe(true);
    });
  });
});
