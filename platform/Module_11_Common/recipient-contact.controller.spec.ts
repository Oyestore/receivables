import { Test, TestingModule } from '@nestjs/testing';
import { RecipientContactController } from '../recipient-contact.controller';
import { RecipientContactService } from '../../services/recipient-contact.service';
import { RecipientContact, CommunicationChannel } from '../../entities/recipient-contact.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateRecipientContactDto, UpdateRecipientContactDto } from '../../dto/recipient-contact.dto';

describe('RecipientContactController', () => {
  let controller: RecipientContactController;
  let service: RecipientContactService;

  const testOrganizationId = 'test-org-id';
  const testUserId = 'test-user-id';
  const mockRequest = {
    user: {
      id: testUserId,
      organizationId: testOrganizationId,
    },
  };

  const testRecipientContact: RecipientContact = {
    id: 'test-id',
    recipientName: 'Test Recipient',
    email: 'test@example.com',
    phone: '1234567890',
    preferredChannel: CommunicationChannel.EMAIL,
    organizationId: testOrganizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecipientContactService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipientContactController],
      providers: [
        {
          provide: RecipientContactService,
          useValue: mockRecipientContactService,
        },
      ],
    }).compile();

    controller = module.get<RecipientContactController>(RecipientContactController);
    service = module.get<RecipientContactService>(RecipientContactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new recipient contact', async () => {
      const createDto: CreateRecipientContactDto = {
        recipientName: 'Test Recipient',
        email: 'test@example.com',
        phone: '1234567890',
        preferredChannel: CommunicationChannel.EMAIL,
        organizationId: testOrganizationId,
      };

      mockRecipientContactService.create.mockResolvedValue(testRecipientContact);

      const result = await controller.create(createDto, mockRequest);

      expect(mockRecipientContactService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(testRecipientContact);
    });

    it('should throw ForbiddenException when organization ID does not match', async () => {
      const createDto: CreateRecipientContactDto = {
        recipientName: 'Test Recipient',
        email: 'test@example.com',
        phone: '1234567890',
        preferredChannel: CommunicationChannel.EMAIL,
        organizationId: 'different-org-id',
      };

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRecipientContactService.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of recipient contacts', async () => {
      mockRecipientContactService.findAll.mockResolvedValue([testRecipientContact]);

      const result = await controller.findAll(mockRequest);

      expect(mockRecipientContactService.findAll).toHaveBeenCalledWith(testOrganizationId);
      expect(result).toEqual([testRecipientContact]);
    });
  });

  describe('findOne', () => {
    it('should return a recipient contact by ID', async () => {
      mockRecipientContactService.findOne.mockResolvedValue(testRecipientContact);

      const result = await controller.findOne('test-id', mockRequest);

      expect(mockRecipientContactService.findOne).toHaveBeenCalledWith('test-id', testOrganizationId);
      expect(result).toEqual(testRecipientContact);
    });

    it('should propagate NotFoundException when recipient contact does not exist', async () => {
      mockRecipientContactService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('non-existent-id', mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the recipient contact', async () => {
      const updateDto: UpdateRecipientContactDto = {
        recipientName: 'Updated Name',
      };

      const updatedContact = { ...testRecipientContact, recipientName: 'Updated Name' };
      mockRecipientContactService.update.mockResolvedValue(updatedContact);

      const result = await controller.update('test-id', updateDto, mockRequest);

      expect(mockRecipientContactService.update).toHaveBeenCalledWith(
        'test-id',
        updateDto,
        testOrganizationId,
      );
      expect(result).toEqual(updatedContact);
    });
  });

  describe('remove', () => {
    it('should remove the recipient contact and return success message', async () => {
      mockRecipientContactService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('test-id', mockRequest);

      expect(mockRecipientContactService.remove).toHaveBeenCalledWith('test-id', testOrganizationId);
      expect(result).toEqual({ message: 'Recipient contact successfully deleted' });
    });
  });
});
