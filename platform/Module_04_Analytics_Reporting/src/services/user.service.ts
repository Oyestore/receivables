import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository, FindManyOptions, FindOptionsOrder, Like } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, LoginDto, UserQueryDto } from '../dto/user.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

  constructor(private readonly userRepository: Repository<User>) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user: ${createUserDto.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      emailVerified: false,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = savedUser;

    this.logger.log(`User created successfully: ${savedUser.id}`);
    return userWithoutPassword as User;
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    this.logger.log(`User login attempt: ${loginDto.email}`);

    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateToken(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    this.logger.log(`User logged in successfully: ${user.id}`);
    return { user: userWithoutPassword as User, token };
  }

  async getUsers(query: UserQueryDto): Promise<{ users: User[]; total: number }> {
    this.logger.log(`Fetching users with query: ${JSON.stringify(query)}`);

    const findOptions: FindManyOptions<User> = {
      where: {},
      order: {},
    };

    // Apply filters
    if (query.search) {
      findOptions.where = [
        { firstName: Like(`%${query.search}%`) },
        { lastName: Like(`%${query.search}%`) },
        { email: Like(`%${query.search}%`) },
      ];
    }

    if (query.role) {
      findOptions.where = { ...findOptions.where, role: query.role };
    }

    if (query.isActive !== undefined) {
      findOptions.where = { ...findOptions.where, isActive: query.isActive };
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    
    if (findOptions.order) {
      (findOptions.order as any)[sortBy] = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    }

    // Apply pagination
    if (query.page && query.limit) {
      findOptions.skip = (query.page - 1) * query.limit;
      findOptions.take = query.limit;
    }

    const [users, total] = await this.userRepository.findAndCount(findOptions);

    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });

    this.logger.log(`Found ${users.length} users out of ${total} total`);
    return { users: usersWithoutPasswords, total };
  }

  async getUserById(id: string): Promise<User> {
    this.logger.log(`Fetching user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    this.logger.log(`User fetched successfully: ${id}`);
    return userWithoutPassword as User;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    this.logger.log(`User updated successfully: ${id}`);
    return userWithoutPassword as User;
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    this.logger.log(`Changing password for user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.password = hashedNewPassword;

    await this.userRepository.save(user);

    this.logger.log(`Password changed successfully: ${id}`);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);

    this.logger.log(`User deleted successfully: ${id}`);
  }

  async deactivateUser(id: string): Promise<void> {
    this.logger.log(`Deactivating user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    this.logger.log(`User deactivated successfully: ${id}`);
  }

  async activateUser(id: string): Promise<void> {
    this.logger.log(`Activating user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;
    await this.userRepository.save(user);

    this.logger.log(`User activated successfully: ${id}`);
  }

  async verifyEmail(id: string): Promise<void> {
    this.logger.log(`Verifying email for user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emailVerified = true;
    await this.userRepository.save(user);

    this.logger.log(`Email verified successfully: ${id}`);
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    this.logger.log(`Updating role for user: ${id} to ${role}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = role;
    const updatedUser = await this.userRepository.save(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    this.logger.log(`User role updated successfully: ${id}`);
    return userWithoutPassword as User;
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: Record<UserRole, number>;
  }> {
    this.logger.log('Fetching user statistics');

    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const inactiveUsers = totalUsers - activeUsers;

    const usersByRole = {
      [UserRole.ADMIN]: 0,
      [UserRole.MANAGER]: 0,
      [UserRole.ANALYST]: 0,
      [UserRole.VIEWER]: 0,
    };

    for (const role of Object.values(UserRole)) {
      usersByRole[role] = await this.userRepository.count({ where: { role } });
    }

    this.logger.log('User statistics fetched successfully');
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
    };
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    this.logger.log(`Searching users with query: ${query}`);

    const users = await this.userRepository.find({
      where: [
        { firstName: Like(`%${query}%`), isActive: true },
        { lastName: Like(`%${query}%`), isActive: true },
        { email: Like(`%${query}%`), isActive: true },
      ],
      take: limit,
      order: { firstName: 'ASC' },
    });

    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });

    this.logger.log(`Found ${users.length} users matching query`);
    return usersWithoutPasswords;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  async validateToken(token: string): Promise<User> {
    this.logger.log('Validating JWT token');

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = await this.userRepository.findOne({ where: { id: decoded.sub } });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return userWithoutPassword as User;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
