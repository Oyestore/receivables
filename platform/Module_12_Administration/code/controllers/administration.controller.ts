import { Controller, Get, Post, Put, Delete, Body, Param, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdministrationService } from '../services/administration.service';
import { Logger } from '../../Module_11_Common/code/logging/logger';
import { AppError, NotFoundError } from '../../Module_11_Common/code/errors/app-error';
import { JwtAuthGuard } from '../../Module_11_Common/code/auth/jwt.service';

const logger = new Logger('AdministrationController');

@ApiTags('Administration')
@Controller('administration')
@UseGuards(JwtAuthGuard)
export class AdministrationController {
  constructor(private readonly administrationService: AdministrationService) {}

  @Post('tenants/:tenantId/users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async createUser(@Param('tenantId') tenantId: string, @Body() userData: any, @Res() res: Response): Promise<void> {
    try {
      const user = await this.administrationService.createUser(tenantId, userData, req.user.id);
      res.status(HttpStatus.CREATED).json(user);
    } catch (error) {
      logger.error('Failed to create user', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
      }
    }
  }

  @Get('tenants/:tenantId/users/:userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUser(@Param('tenantId') tenantId: string, @Param('userId') userId: string, @Res() res: Response): Promise<void> {
    try {
      const user = await this.administrationService.getUser(tenantId, userId);
      res.status(HttpStatus.OK).json(user);
    } catch (error) {
      logger.error('Failed to get user', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const users = await administrationService.listUsers(tenantId, req.query);
      res.status(200).json(users);
    } catch (error) {
      logger.error('Failed to list users', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const user = await administrationService.updateUser(tenantId, userId, req.body, req.user.id);
      res.status(200).json(user);
    } catch (error) {
      logger.error('Failed to update user', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async createTenant(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await administrationService.createTenant(req.body, req.user.id);
      res.status(201).json(tenant);
    } catch (error) {
      logger.error('Failed to create tenant', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getTenant(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const tenant = await administrationService.getTenant(tenantId);
      res.status(200).json(tenant);
    } catch (error) {
      logger.error('Failed to get tenant', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async listTenants(req: Request, res: Response): Promise<void> {
    try {
      const tenants = await administrationService.listTenants(req.query);
      res.status(200).json(tenants);
    } catch (error) {
      logger.error('Failed to list tenants', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateTenant(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const tenant = await administrationService.updateTenant(tenantId, req.body, req.user.id);
      res.status(200).json(tenant);
    } catch (error) {
      logger.error('Failed to update tenant', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const role = await administrationService.createRole(tenantId, req.body, req.user.id);
      res.status(201).json(role);
    } catch (error) {
      logger.error('Failed to create role', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getRole(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, roleId } = req.params;
      const role = await administrationService.getRole(tenantId, roleId);
      res.status(200).json(role);
    } catch (error) {
      logger.error('Failed to get role', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async listRoles(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const roles = await administrationService.listRoles(tenantId);
      res.status(200).json(roles);
    } catch (error) {
      logger.error('Failed to list roles', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, roleId } = req.params;
      const role = await administrationService.updateRole(tenantId, roleId, req.body, req.user.id);
      res.status(200).json(role);
    } catch (error) {
      logger.error('Failed to update role', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async assignRoleToUser(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { userId, roleId } = req.body;
      await administrationService.assignRoleToUser(tenantId, userId, roleId, req.user.id);
      res.status(200).json({ message: 'Role assigned successfully' });
    } catch (error) {
      logger.error('Failed to assign role', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async revokeRoleFromUser(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId, roleId } = req.params;
      await administrationService.revokeRoleFromUser(tenantId, userId, roleId, req.user.id);
      res.status(200).json({ message: 'Role revoked successfully' });
    } catch (error) {
      logger.error('Failed to revoke role', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const permissions = await administrationService.getUserPermissions(tenantId, userId);
      res.status(200).json(permissions);
    } catch (error) {
      logger.error('Failed to get user permissions', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}

export const administrationController = new AdministrationController();
