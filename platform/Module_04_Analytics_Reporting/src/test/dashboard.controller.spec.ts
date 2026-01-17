import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../services/dashboard.service';
import { DashboardController } from '../controllers/dashboard.controller';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { User } from '../entities/user.entity';
import { CreateDashboardDto, UpdateDashboardDto } from '../dto/dashboard.dto';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;
  let mockUser: User;

  beforeEach(async () => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            createDashboard: jest.fn(),
            getDashboards: jest.fn(),
            getDashboardById: jest.fn(),
            updateDashboard: jest.fn(),
            deleteDashboard: jest.fn(),
            duplicateDashboard: jest.fn(),
            shareDashboard: jest.fn(),
            unshareDashboard: jest.fn(),
            getDashboardVersions: jest.fn(),
            restoreDashboardVersion: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createDashboard', () => {
    it('should create a dashboard', async () => {
      const createDashboardDto: CreateDashboardDto = {
        name: 'Test Dashboard',
        description: 'Test Description',
        type: 'business',
        layout: { grid: { cols: 12, rows: 8 } },
        isPublic: false,
        tags: ['test'],
      };

      const expectedDashboard = {
        id: 'dashboard-123',
        ...createDashboardDto,
        createdBy: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'createDashboard').mockResolvedValue(expectedDashboard);

      const result = await controller.createDashboard(createDashboardDto, mockUser);

      expect(service.createDashboard).toHaveBeenCalledWith(createDashboardDto, mockUser.id);
      expect(result).toEqual(expectedDashboard);
    });
  });

  describe('getDashboards', () => {
    it('should get dashboards for user', async () => {
      const query = { page: 1, limit: 10 };
      const expectedDashboards = {
        dashboards: [
          {
            id: 'dashboard-123',
            name: 'Test Dashboard',
            createdBy: mockUser.id,
          } as Dashboard,
        ],
        total: 1,
      };

      jest.spyOn(service, 'getDashboards').mockResolvedValue(expectedDashboards);

      const result = await controller.getDashboards(query, mockUser);

      expect(service.getDashboards).toHaveBeenCalledWith(query, mockUser.id);
      expect(result).toEqual(expectedDashboards);
    });
  });

  describe('getDashboardById', () => {
    it('should get dashboard by id', async () => {
      const dashboardId = 'dashboard-123';
      const expectedDashboard = {
        id: dashboardId,
        name: 'Test Dashboard',
        createdBy: mockUser.id,
      } as Dashboard;

      jest.spyOn(service, 'getDashboardById').mockResolvedValue(expectedDashboard);

      const result = await controller.getDashboardById(dashboardId, mockUser);

      expect(service.getDashboardById).toHaveBeenCalledWith(dashboardId, mockUser.id);
      expect(result).toEqual(expectedDashboard);
    });
  });

  describe('updateDashboard', () => {
    it('should update dashboard', async () => {
      const dashboardId = 'dashboard-123';
      const updateDashboardDto: UpdateDashboardDto = {
        name: 'Updated Dashboard',
        description: 'Updated Description',
      };

      const expectedDashboard = {
        id: dashboardId,
        ...updateDashboardDto,
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'updateDashboard').mockResolvedValue(expectedDashboard);

      const result = await controller.updateDashboard(dashboardId, updateDashboardDto, mockUser);

      expect(service.updateDashboard).toHaveBeenCalledWith(dashboardId, updateDashboardDto, mockUser.id);
      expect(result).toEqual(expectedDashboard);
    });
  });

  describe('deleteDashboard', () => {
    it('should delete dashboard', async () => {
      const dashboardId = 'dashboard-123';

      jest.spyOn(service, 'deleteDashboard').mockResolvedValue(undefined);

      await controller.deleteDashboard(dashboardId, mockUser);

      expect(service.deleteDashboard).toHaveBeenCalledWith(dashboardId, mockUser.id);
    });
  });

  describe('duplicateDashboard', () => {
    it('should duplicate dashboard', async () => {
      const dashboardId = 'dashboard-123';
      const name = 'Duplicated Dashboard';
      const expectedDashboard = {
        id: 'dashboard-456',
        name,
        createdBy: mockUser.id,
        createdAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'duplicateDashboard').mockResolvedValue(expectedDashboard);

      const result = await controller.duplicateDashboard(dashboardId, name, mockUser);

      expect(service.duplicateDashboard).toHaveBeenCalledWith(dashboardId, name, mockUser.id);
      expect(result).toEqual(expectedDashboard);
    });
  });

  describe('shareDashboard', () => {
    it('should share dashboard', async () => {
      const dashboardId = 'dashboard-123';
      const userIds = ['user-456', 'user-789'];
      const role = 'viewer';

      jest.spyOn(service, 'shareDashboard').mockResolvedValue(undefined);

      await controller.shareDashboard(dashboardId, userIds, role, mockUser);

      expect(service.shareDashboard).toHaveBeenCalledWith(dashboardId, userIds, role, mockUser.id);
    });
  });

  describe('unshareDashboard', () => {
    it('should unshare dashboard', async () => {
      const dashboardId = 'dashboard-123';
      const userId = 'user-456';

      jest.spyOn(service, 'unshareDashboard').mockResolvedValue(undefined);

      await controller.unshareDashboard(dashboardId, userId, mockUser);

      expect(service.unshareDashboard).toHaveBeenCalledWith(dashboardId, userId, mockUser.id);
    });
  });

  describe('getDashboardVersions', () => {
    it('should get dashboard versions', async () => {
      const dashboardId = 'dashboard-123';
      const expectedVersions = [
        {
          id: 'version-123',
          dashboardId,
          version: 1,
          name: 'Version 1',
          createdAt: new Date(),
        },
      ];

      jest.spyOn(service, 'getDashboardVersions').mockResolvedValue(expectedVersions);

      const result = await controller.getDashboardVersions(dashboardId, mockUser);

      expect(service.getDashboardVersions).toHaveBeenCalledWith(dashboardId, mockUser.id);
      expect(result).toEqual(expectedVersions);
    });
  });

  describe('restoreDashboardVersion', () => {
    it('should restore dashboard version', async () => {
      const dashboardId = 'dashboard-123';
      const versionId = 'version-123';
      const expectedDashboard = {
        id: dashboardId,
        name: 'Restored Dashboard',
        updatedAt: new Date(),
      } as Dashboard;

      jest.spyOn(service, 'restoreDashboardVersion').mockResolvedValue(expectedDashboard);

      const result = await controller.restoreDashboardVersion(dashboardId, versionId, mockUser);

      expect(service.restoreDashboardVersion).toHaveBeenCalledWith(dashboardId, versionId, mockUser.id);
      expect(result).toEqual(expectedDashboard);
    });
  });
});
