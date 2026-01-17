import { Test, TestingModule } from '@nestjs/testing';
import { RecipientContactService } from '../../services/recipient-contact.service';
import { RecipientContact, CommunicationChannel } from '../../entities/recipient-contact.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CreateRecipientContactDto, UpdateRecipientContactDto } from '../../dto/recipient-contact.dto';

describe('RecipientContactService', () => {
  let service: RecipientContactService;
  let repository: Repository<RecipientContact>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const testOrganizationId = 'test-org-id';
  const testRecipientContact = {
    id: 'test-id',
    recipientName: 'Test Recipient',
    email: 'test@example.com',
    phone: '1234567890',
    preferredChannel: CommunicationChannel.EMAIL,
    organizationId: testOrganizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipientContactService,
        {
          provide: getRepositoryToken(RecipientContact),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RecipientContactService>(RecipientContactService);
    repository = module.get<Repository<RecipientContact>>(getRepositoryToken(RecipientContact));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      mockRepository.create.mockReturnValue(testRecipientContact);
      mockRepository.save.mockResolvedValue(testRecipientContact);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(testRecipientContact);
      expect(result).toEqual(testRecipientContact);
    });
  });

  describe('findAll', () => {
    it('should return an array of recipient contacts for the organization', async () => {
      mockRepository.find.mockResolvedValue([testRecipientContact]);

      const result = await service.findAll(testOrganizationId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { organizationId: testOrganizationId },
        order: { recipientName: 'ASC' },
      });
      expect(result).toEqual([testRecipientContact]);
    });
  });

  describe('findOne', () => {
    it('should return a recipient contact when it exists', async () => {
      mockRepository.findOne.mockResolvedValue(testRecipientContact);

      const result = await service.findOne('test-id', testOrganizationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id', organizationId: testOrganizationId },
      });
      expect(result).toEqual(testRecipientContact);
    });

    it('should throw NotFoundException when recipient contact does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', testOrganizationId)).rejects.toThrow(
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

      mockRepository.findOne.mockResolvedValue(testRecipientContact);
      mockRepository.save.mockResolvedValue(updatedContact);

      const result = await service.update('test-id', updateDto, testOrganizationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id', organizationId: testOrganizationId },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...testRecipientContact,
        ...updateDto,
      });
      expect(result).toEqual(updatedContact);
    });
  });

  describe('remove', () => {
    it('should remove the recipient contact', async () => {
      mockRepository.findOne.mockResolvedValue(testRecipientContact);

      await service.remove('test-id', testOrganizationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id', organizationId: testOrganizationId },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(testRecipientContact);
    });
  });

  describe('findByEmail', () => {
    it('should return a recipient contact when it exists with the given email', async () => {
      mockRepository.findOne.mockResolvedValue(testRecipientContact);

      const result = await service.findByEmail('test@example.com', testOrganizationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', organizationId: testOrganizationId },
      });
      expect(result).toEqual(testRecipientContact);
    });
  });

  describe('findByPhone', () => {
    it('should return a recipient contact when it exists with the given phone', async () => {
      mockRepository.findOne.mockResolvedValue(testRecipientContact);

      const result = await service.findByPhone('1234567890', testOrganizationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '1234567890', organizationId: testOrganizationId },
      });
      expect(result).toEqual(testRecipientContact);
    });
  });
});
