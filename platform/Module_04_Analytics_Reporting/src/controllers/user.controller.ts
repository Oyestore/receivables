import { Injectable, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, LoginDto, UserQueryDto } from '../dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

@Injectable()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  async createUser(createUserDto: CreateUserDto) {
    this.logger.log(`POST /users - Creating user: ${createUserDto.email}`);
    return await this.userService.createUser(createUserDto);
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`POST /auth/login - User login attempt: ${loginDto.email}`);
    return await this.userService.login(loginDto);
  }

  async getUsers(query: UserQueryDto) {
    this.logger.log(`GET /users - Fetching users`);
    return await this.userService.getUsers(query);
  }

  async getUserById(id: string) {
    this.logger.log(`GET /users/:id - Fetching user: ${id}`);
    return await this.userService.getUserById(id);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    this.logger.log(`PUT /users/:id - Updating user: ${id}`);
    return await this.userService.updateUser(id, updateUserDto);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto) {
    this.logger.log(`POST /users/:id/change-password - Changing password for user: ${id}`);
    return await this.userService.changePassword(id, changePasswordDto);
  }

  async deleteUser(id: string) {
    this.logger.log(`DELETE /users/:id - Deleting user: ${id}`);
    return await this.userService.deleteUser(id);
  }

  async deactivateUser(id: string) {
    this.logger.log(`POST /users/:id/deactivate - Deactivating user: ${id}`);
    return await this.userService.deactivateUser(id);
  }

  async activateUser(id: string) {
    this.logger.log(`POST /users/:id/activate - Activating user: ${id}`);
    return await this.userService.activateUser(id);
  }

  async verifyEmail(id: string) {
    this.logger.log(`POST /users/:id/verify-email - Verifying email for user: ${id}`);
    return await this.userService.verifyEmail(id);
  }

  async updateUserRole(id: string, role: string) {
    this.logger.log(`PUT /users/:id/role - Updating role for user: ${id} to ${role}`);
    return await this.userService.updateUserRole(id, role as any);
  }

  async getUserStats() {
    this.logger.log(`GET /users/stats - Fetching user statistics`);
    return await this.userService.getUserStats();
  }

  async searchUsers(query: string, limit: number) {
    this.logger.log(`GET /users/search - Searching users with query: ${query}`);
    return await this.userService.searchUsers(query, limit);
  }
}
