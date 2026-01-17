import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../services/dashboard.service';
import { Repository } from 'typeorm';
import { Dashboard, DashboardType } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardVersion } from '../entities/dashboard-version.entity';
import { DashboardCollaboration } from '../entities/dashboard-collaboration.entity';
import { User } from '../entities/user.entity';
import { CreateDashboardDto, UpdateDashboardDto } from '../dto/dashboard.dto';

describe('DashboardService', () => {
  let service: DashboardService;
  let dashboardRepository: Repository<Dashboard>;
  let widgetRepository: Repository<DashboardWidget>;
  let versionRepository: Repository<DashboardVersion>;
  let collaborationRepository: Repository<DashboardCollaboration>;
  let userRepository: Repository<User>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: 'DashboardRepository',
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
            increment: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: 'DashboardWidgetRepository',
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'DashboardVersionRepository',
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: 'DashboardCollaborationRepository',
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: 'UserRepository',
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    dashboardRepository = module.get<Repository<Dashboard>>('DashboardRepository');
    widgetRepository = module.get<Repository<DashboardWidget>>('DashboardWidgetRepository');
    versionRepository = module.get<Repository<DashboardVersion>>('DashboardVersionRepository');
    collaborationRepository = module.get<Repository<DashboardCollaboration>>('DashboardCollaborationRepository');
    userRepository = module.get<Repository<User>>('UserRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDashboard', () => {
    it('should create a dashboard successfully', async () => {
      const createDashboardDto: CreateDashboardDto = {
        name: 'Test Dashboard',
        description: 'Test Description',
        type: DashboardType.BUSINESS,
        layout: { grid: { cols: 12, rows: 8 } },
        isPublic: false,
        tags: ['test'],
      };

      const expectedDashboard = {
        id: 'dashboard-123',
        ...createDashboardDto,
        createdBy: mockUser.id,
        creator: mockUser,
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(dashboardRepository, 'create').mockReturnValue(expectedDashboard);
      jest.spyOn(dashboardRepository, 'save').mockResolvedValue(expectedDashboard);
      jest.spyOn(versionRepository, 'create').mockReturnValue({
        id: 'version-123',
        dashboardId: expectedDashboard.id,
        version: 1,
        name: 'Initial version',
        layout: expectedDashboard.layout,
        widgets: [],
        createdBy: mockUser.id,
        changeDescription: 'Initial version',
        isActive: false,
        createdAt: new Date(),
      } as DashboardVersion);
      jest.spyOn(versionRepository, 'save').mockResolvedValue({} as DashboardVersion);

      const result = await service.createDashboard(createDashboardDto, mockUser.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(dashboardRepository.create).toHaveBeenCalledWith({
        ...createDashboardDto,
        createdBy: mockUser.id,
        creator: mockUser,
      });
      expect(dashboardRepository.save).toHaveBeenCalledWith(expectedDashboard);
      expect(result).toEqual(expectedDashboard);
    });

    it('should throw NotFoundException if user not found', async () => {
      const createDashboardDto: CreateDashboardDto = {
        name: 'Test Dashboard',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createDashboard(createDashboardDto, 'invalid-user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDashboards', () => {
    it('should get dashboards for user', async () => {
      const query = { page: 1, limit: 10 };
      const expectedDashboards = [
        {
          id: 'dashboard-123',
          name: 'Test Dashboard',
          createdBy: mockUser.id,
          creator: mockUser,
          widgets: [],
          sharedWith: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Dashboard,
      ];

      jest.spyOn(dashboardRepository, 'findAndCount').mockResolvedValue([expectedDashboards, 1]);

      const result = await service.getDashboards(query, mockUser.id);

      expect(dashboardRepository.findAndCount).toHaveBeenCalledWith({
        where: [
          { createdBy: mockUser.id },
          { sharedWith: { id: mockUser.id } },
          { isPublic: true },
        ],
        relations: ['creator', 'widgets', 'sharedWith'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({ dashboards: expectedDashboards, total: 1 });
    });
  });

  describe('getDashboardById', () => {
    it('should get dashboard by id', async () => {
      const dashboardId = 'dashboard-123';
      const expectedDashboard = {
        id: dashboardId,
        name: 'Test Dashboard',
        createdBy: mockUser.id,
        creator: mockUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(expectedDashboard);
      jest.spyOn(dashboardRepository, 'increment').mockResolvedValue(undefined);
      jest.spyOn(dashboardRepository, 'update').mockResolvedValue(undefined);

      const result = await service.getDashboardById(dashboardId, mockUser.id);

      expect(dashboardRepository.findOne).toHaveBeenCalledWith({
        where: { id: dashboardId },
        relations: ['creator', 'widgets', 'versions', 'collaborations', 'sharedWith'],
      });
      expect(result).toEqual(expectedDashboard);
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      const dashboardId = 'invalid-dashboard';

      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getDashboardById(dashboardId, mockUser.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user has no access', async () => {
      const dashboardId = 'dashboard-123';
      const otherUser = { ...mockUser, id: 'other-user' };
      const dashboard = {
        id: dashboardId,
        name: 'Test Dashboard',
        createdBy: otherUser.id,
        creator: otherUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(dashboard);

      await expect(service.getDashboardById(dashboardId, mockUser.id)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateDashboard', () => {
    it('should update dashboard successfully', async () => {
      const dashboardId = 'dashboard-123';
      const updateDashboardDto: UpdateDashboardDto = {
        name: 'Updated Dashboard',
        description: 'Updated Description',
      };

      const existingDashboard = {
        id: dashboardId,
        name: 'Original Dashboard',
        createdBy: mockUser.id,
        creator: mockUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        layout: { grid: { cols: 12, rows: 8 } },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      const updatedDashboard = {
        ...existingDashboard,
        ...updateDashboardDto,
        version: 2,
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'getDashboardById').mockResolvedValue(existingDashboard);
      jest.spyOn(dashboardRepository, 'save').mockResolvedValue(updatedDashboard);

      const result = await service.updateDashboard(dashboardId, updateDashboardDto, mockUser.id);

      expect(service.getDashboardById).toHaveBeenCalledWith(dashboardId, mockUser.id);
      expect(dashboardRepository.save).toHaveBeenCalledWith(updatedDashboard);
      expect(result).toEqual(updatedDashboard);
    });
  });

  describe('deleteDashboard', () => {
    it('should delete dashboard successfully', async () => {
      const dashboardId = 'dashboard-123';
      const dashboard = {
        id: dashboardId,
        name: 'Test Dashboard',
        createdBy: mockUser.id,
        creator: mockUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'getDashboardById').mockResolvedValue(dashboard);
      jest.spyOn(dashboardRepository, 'remove').mockResolvedValue(undefined);

      await service.deleteDashboard(dashboardId, mockUser.id);

      expect(service.getDashboardById).toHaveBeenCalledWith(dashboardId, mockUser.id);
      expect(dashboardRepository.remove).toHaveBeenCalledWith(dashboard);
    });

    it('should throw UnauthorizedException if user is not owner', async () => {
      const dashboardId = 'dashboard-123';
      const otherUser = { ...mockUser, id: 'other-user' };
      const dashboard = {
        id: dashboardId,
        name: 'Test Dashboard',
        createdBy: otherUser.id,
        creator: otherUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'getDashboardById').mockResolvedValue(dashboard);

      await expect(service.deleteDashboard(dashboardId, mockUser.id)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('duplicateDashboard', () => {
    it('should duplicate dashboard successfully', async () => {
      const dashboardId = 'dashboard-123';
      const name = 'Duplicated Dashboard';
      const position = { x: 0, y: 0, w: 6, h: 4 };

      const originalDashboard = {
        id: dashboardId,
        name: 'Original Dashboard',
        createdBy: mockUser.id,
        creator: mockUser,
        widgets: [
          {
            id: 'widget-123',
            name: 'Test Widget',
            type: 'chart',
            position: { x: 0, y: 0, w: 6, h: 4 },
            config: {},
            dataSource: {},
            isVisible: true,
            refreshInterval: 300,
            dashboardId,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as DashboardWidget,
        ],
        versions: [],
        collaborations: [],
        sharedWith: [],
        description: 'Original Description',
        type: DashboardType.BUSINESS,
        layout: { grid: { cols: 12, rows: 8 } },
        isPublic: false,
        tags: ['original'],
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      const duplicatedDashboard = {
        id: 'dashboard-456',
        name,
        createdBy: mockUser.id,
        creator: mockUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        description: originalDashboard.description,
        type: originalDashboard.type,
        layout: originalDashboard.layout,
        isPublic: false,
        tags: originalDashboard.tags,
        metadata: originalDashboard.metadata,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'getDashboardById').mockResolvedValue(originalDashboard);
      jest.spyOn(dashboardRepository, 'create').mockReturnValue(duplicatedDashboard);
      jest.spyOn(dashboardRepository, 'save').mockResolvedValue(duplicatedDashboard);
      jest.spyOn(widgetRepository, 'create').mockReturnValue({
        id: 'widget-456',
        dashboardId: duplicatedDashboard.id,
        name: 'Test Widget',
        type: 'chart',
        position,
        config: {},
        dataSource: {},
        isVisible: true,
        refreshInterval: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DashboardWidget);
      jest.spyOn(widgetRepository, 'save').mockResolvedValue({} as DashboardWidget);

      const result = await service.duplicateDashboard(dashboardId, name, mockUser.id);

      expect(service.getDashboardById).toHaveBeenCalledWith(dashboardId, mockUser.id);
      expect(dashboardRepository.create).toHaveBeenCalledWith({
        name,
        description: originalDashboard.description,
        type: originalDashboard.type,
        layout: originalDashboard.layout,
        isPublic: false,
        createdBy: mockUser.id,
        tags: originalDashboard.tags,
        metadata: originalDashboard.metadata,
      });
      expect(result).toEqual(duplicatedDashboard);
    });
  });

  describe('shareDashboard', () => {
    it('should share dashboard successfully', async () => {
      const dashboardId = 'dashboard-123';
      const userIds = ['user-456', 'user-789'];
      const role = 'viewer';

      const dashboard = {
        id: dashboardId,
        name: 'Test Dashboard',
        createdBy: mockUser.id,
        creator: mockUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      const targetUser = {
        id: 'user-456',
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
        role: 'viewer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      jest.spyOn(service, 'getDashboardById').mockResolvedValue(dashboard);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(targetUser);
      jest.spyOn(collaborationRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(collaborationRepository, 'create').mockReturnValue({
        id: 'collaboration-123',
        dashboardId,
        userId: 'user-456',
        role,
        invitedBy: mockUser.id,
        invitedAt: new Date(),
        isActive: true,
      } as DashboardCollaboration);
      jest.spyOn(collaborationRepository, 'save').mockResolvedValue({} as DashboardCollaboration);

      await service.shareDashboard(dashboardId, userIds, role, mockUser.id);

      expect(service.getDashboardById).toHaveBeenCalledWith(dashboardId, mockUser.id);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-456' } });
      expect(collaborationRepository.create).toHaveBeenCalledWith({
        dashboardId,
        userId: 'user-456',
        role,
        invitedBy: mockUser.id,
        invitedAt: new Date(),
      });
    });

    it('should throw UnauthorizedException if user is not owner', async () => {
      const dashboardId = 'dashboard-123';
      const userIds = ['user-456'];
      const role = 'viewer';
      const otherUser = { ...mockUser, id: 'other-user' };

      const dashboard = {
        id: dashboardId,
        name: 'Test Dashboard',
        createdBy: otherUser.id,
        creator: otherUser,
        widgets: [],
        versions: [],
        collaborations: [],
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'getDashboardById').mockResolvedValue(dashboard);

      await expect(service.shareDashboard(dashboardId, userIds, role, mockUser.id)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('hasAccess', () => {
    it('should return true for dashboard owner', () => {
      const dashboard = {
        id: 'dashboard-123',
        name: 'Test Dashboard',
        createdBy: mockUser.id,
        isPublic: false,
        sharedWith: [],
        collaborations: [],
      } as Dashboard;

      const result = (service as any).hasAccess(dashboard, mockUser.id);
      expect(result).toBe(true);
    });

    it('should return true for public dashboard', () => {
      const dashboard = {
        id: 'dashboard-123',
        name: 'Test Dashboard',
        createdBy: 'other-user',
        isPublic: true,
        sharedWith: [],
        collaborations: [],
      } as Dashboard;

      const result = (service as any).hasAccess(dashboard, mockUser.id);
      expect(result).toBe(true);
    });

    it('should return true for shared dashboard', () => {
      const dashboard = {
        id: 'dashboard-123',
        name: 'Test Dashboard',
        createdBy: 'other-user',
        isPublic: false,
        sharedWith: [mockUser],
        collaborations: [],
      } as Dashboard;

      const result = (service as any).hasAccess(dashboard, mockUser.id);
      expect(result).toBe(true);
    });

    it('should return false for private dashboard not shared with user', () => {
      const dashboard = {
        id: 'dashboard-123',
        name: 'Test Dashboard',
        createdBy: 'other-user',
        isPublic: false,
        sharedWith: [],
        collaborations: [],
      } as Dashboard;

      const result = (service as any).hasAccess(dashboard, mockUser.id);
      expect(result).toBe(false);
    });
  });

  describe('hasEditAccess', () => {
    it('should return true for dashboard owner', () => {
      const dashboard = {
        id: 'dashboard-123',
        name: 'Test Dashboard',
        createdBy: mockUser.id,
        collaborations: [],
      } as Dashboard;

      const result = (service as any).hasEditAccess(dashboard, mockUser.id);
      expect(result).toBe(true);
    });

    it('should return true for collaborator with editor role', () => {
      const dashboard = {
        id: 'dashboard-123',
        name: 'Test Dashboard',
        createdBy: 'other-user',
        collaborations: [
          {
            userId: mockUser.id,
            role: 'editor',
            isActive: true,
          },
        ],
      } as Dashboard;

      const result = (service as any).hasEditAccess(dashboard, mockUser.id);
      expect(result).toBe(true);
    });

    it('should return false for collaborator with viewer role', () => {
      const dashboard = {
        id: 'dashboard-123',
        name: 'Test Dashboard',
        createdBy: 'other-user',
        collaborations: [
          {
            userId: mockUser.id,
            role: 'viewer',
            isActive: true,
          },
        ],
      } as Dashboard;

      const result = (service as any).hasEditAccess(dashboard, mockUser.id);
      expect(result).toBe(false);
    });
  });
});
