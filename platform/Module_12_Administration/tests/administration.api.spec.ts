import request from 'supertest';
import express from 'express';
import adminRoutes from '../../../src/modules/administration/routes/administration.routes';
import { administrationService } from '../../../src/modules/administration/services/administration.service';
import { authMiddleware } from '../../../src/common/auth/auth.middleware';

// Mock the services and middleware
jest.mock('../../../src/modules/administration/services/administration.service');
jest.mock('../../../src/common/auth/auth.middleware');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'test-user-id', tenantId: 'test-tenant-id' };
  next();
});
app.use('/api/v1', adminRoutes);

describe('Administration API', () => {

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock middleware to always pass
    (authMiddleware.authenticate as jest.Mock).mockImplementation((req, res, next) => next());
    (authMiddleware.authorize as jest.Mock).mockImplementation(() => (req, res, next) => next());
  });

  describe('Tenant Management', () => {
    it('should create a new tenant', async () => {
      const tenantData = { name: 'Test Tenant', slug: 'test-tenant' };
      (administrationService.createTenant as jest.Mock).mockResolvedValue({ id: 'new-tenant-id', ...tenantData });

      const res = await request(app)
        .post('/api/v1/tenants')
        .send(tenantData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'new-tenant-id');
      expect(administrationService.createTenant).toHaveBeenCalledWith(tenantData, 'test-user-id');
    });

    it('should get a tenant by ID', async () => {
      const tenantId = 'test-tenant-id';
      (administrationService.getTenant as jest.Mock).mockResolvedValue({ id: tenantId, name: 'Test Tenant' });

      const res = await request(app).get(`/api/v1/tenants/${tenantId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', tenantId);
      expect(administrationService.getTenant).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('User Management', () => {
    const tenantId = 'test-tenant-id';

    it('should create a new user in a tenant', async () => {
      const userData = { email: 'test@example.com', password: 'password123', first_name: 'Test', last_name: 'User' };
      (administrationService.createUser as jest.Mock).mockResolvedValue({ id: 'new-user-id', ...userData });

      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/users`)
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'new-user-id');
      expect(administrationService.createUser).toHaveBeenCalledWith(tenantId, userData, 'test-user-id');
    });

    it('should list users in a tenant', async () => {
      (administrationService.listUsers as jest.Mock).mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      const res = await request(app).get(`/api/v1/tenants/${tenantId}/users`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(administrationService.listUsers).toHaveBeenCalledWith(tenantId, {});
    });
  });

  describe('Role Management', () => {
    const tenantId = 'test-tenant-id';

    it('should create a new role in a tenant', async () => {
      const roleData = { name: 'Test Role', permissions: ['read:invoices'] };
      (administrationService.createRole as jest.Mock).mockResolvedValue({ id: 'new-role-id', ...roleData });

      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/roles`)
        .send(roleData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'new-role-id');
      expect(administrationService.createRole).toHaveBeenCalledWith(tenantId, roleData, 'test-user-id');
    });

    it('should assign a role to a user', async () => {
      const assignment = { userId: 'user-1', roleId: 'role-1' };
      (administrationService.assignRoleToUser as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/roles/assign`)
        .send(assignment);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Role assigned successfully');
      expect(administrationService.assignRoleToUser).toHaveBeenCalledWith(tenantId, assignment.userId, assignment.roleId, 'test-user-id');
    });
  });
});
