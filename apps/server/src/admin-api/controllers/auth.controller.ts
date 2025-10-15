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

@ApiTags('Admin API - Authentication')
@Controller('admin-api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly adminAuthService: AdminAuthService) {}

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
  async login(@Request() req: any): Promise<AdminLoginResponseDto> {
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
  async getProfile(@Request() req: any): Promise<AdminProfileDto> {
    const admin = req.user;
    const adminUser = await this.adminAuthService.getAdminUser(admin.username);
    
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    return {
      id: (adminUser._id as any).toString(),
      username: adminUser.username,
      role: adminUser.role,
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
    @Request() req: any,
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<AdminUserResponseDto> {
    this.logger.log(`Super-admin creating new admin: ${createAdminDto.username}`);

    const user = await this.adminAuthService.createAdmin(
      createAdminDto.username,
      createAdminDto.password,
      createAdminDto.role || 'admin',
      createAdminDto.email,
    );

    return {
      id: (user._id as any).toString(),
      username: user.username,
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
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
