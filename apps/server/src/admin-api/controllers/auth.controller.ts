import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AdminAuthService } from '../services/admin-auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SuperAdminAuthGuard } from '../guards/super-admin-auth.guard';
import { AdminLoginDto, AdminLoginResponseDto, AdminProfileDto } from '../dto/admin-auth.dto';
import { CreateAdminDto, AdminUserResponseDto, UpdatePasswordDto } from '../dto/create-admin.dto';
import type { AuthenticatedUser } from '../services/admin-auth.service';
import { isAdminApiRole } from '../../common/constants/auth.constants';
import { AdminUsersService } from '../../domain/admin-users/admin-users.service';

@ApiTags('Admin API - Authentication')
@Controller('admin-api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Admin login', 
    description: 'Authenticate admin user and receive JWT token' 
  })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful', 
    type: AdminLoginResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account is for customer portal' })
  async login(
    @Request() req: { user: AuthenticatedUser },
  ): Promise<AdminLoginResponseDto> {
    if (!isAdminApiRole(req.user.role)) {
      throw new ForbiddenException(
        'This account must sign in via the customer portal.',
      );
    }
    this.logger.log(`Login successful for user: ${req.user.username}`);
    return this.adminAuthService.login(req.user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get admin profile', 
    description: 'Get current authenticated admin user profile' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile retrieved successfully', 
    type: AdminProfileDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @Request() req: { user?: { username?: string } },
  ): Promise<AdminProfileDto> {
    const username = req.user?.username;
    if (!username) {
      throw new Error('Unauthorized: missing username');
    }

    const adminUser = await this.adminAuthService.getAdminUser(username);
    
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    return {
      id: (adminUser._id as any).toString(),
      username: adminUser.username,
      role: adminUser.role,
      virtualAccountId: adminUser.virtualAccountId,
      bossId: adminUser.bossId,
      createdAt: adminUser.createdAt,
    };
  }

  @Post('users')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create new admin user', 
    description: 'Create a new admin user (requires SUPER_ADMIN_TOKEN)' 
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Admin user created successfully',
    type: AdminUserResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - user already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async createAdmin(
    @Request() req: { user?: unknown },
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<AdminUserResponseDto> {
    this.logger.log(`Super-admin creating new admin: ${createAdminDto.username}`);

    const user = await this.adminAuthService.createAdmin(
      createAdminDto.username,
      createAdminDto.password,
      createAdminDto.role || 'admin',
      createAdminDto.email,
      { virtualAccountId: createAdminDto.virtualAccountId, bossId: createAdminDto.bossId },
    );

    return {
      id: (user._id as any).toString(),
      username: user.username,
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      virtualAccountId: user.virtualAccountId,
      bossId: user.bossId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('users')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'List all admin users', 
    description: 'Get list of all admin users (requires SUPER_ADMIN_TOKEN)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin users retrieved successfully',
    type: [AdminUserResponseDto] 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async listAdmins(@Request() req: any): Promise<AdminUserResponseDto[]> {

    const users = await this.adminAuthService.listAdminUsers();

    return users.map(user => ({
      id: (user._id as any).toString(),
      username: user.username,
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  @Patch('users/:username/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update admin password', 
    description: 'Update password for an admin user (super-admin or self)' 
  })
  @ApiParam({ name: 'username', description: 'Username of the admin' })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updatePassword(
    @Request() req: any,
    @Param('username') username: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    // Allow super-admin or the user themselves
    if (req.user.role !== 'super-admin' && req.user.username !== username) {
      throw new ForbiddenException('You can only update your own password');
    }

    await this.adminAuthService.updatePassword(username, updatePasswordDto.newPassword);

    this.logger.log(`Password updated for user: ${username}`);

    return { username, updated: true };
  }

  @Post('users/:username/reset-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset boss password to random value',
    description:
      'Admin/super-admin resets and returns a new random password for a boss user who forgot their password.',
  })
  @ApiParam({ name: 'username', description: 'Username of the boss user' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully. New password is returned once.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async resetBossPassword(
    @Request() req: any,
    @Param('username') username: string,
  ): Promise<{ username: string; newPassword: string }> {
    if (!isAdminApiRole(req.user.role)) {
      throw new ForbiddenException('Only admin users can reset boss passwords');
    }

    const result = await this.adminUsersService.resetBossPasswordRandom(
      username,
    );

    this.logger.log(`Random password reset (admin-api) for boss: ${username}`);

    return result;
  }

  @Delete('users/:username')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Deactivate admin user', 
    description: 'Deactivate an admin user (requires SUPER_ADMIN_TOKEN)' 
  })
  @ApiParam({ name: 'username', description: 'Username of the admin to deactivate' })
  @ApiResponse({ status: 200, description: 'Admin user deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async deactivateAdmin(
    @Request() req: any,
    @Param('username') username: string,
  ) {
    await this.adminAuthService.deactivateUser(username);

    this.logger.log(`Admin user deactivated: ${username}`);

    return { username, deactivated: true };
  }

}
