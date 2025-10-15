import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import {
  ApproveUserDto,
  DenyUserDto,
  RevokeUserDto,
  BulkApproveDto,
  UserStatsResponseDto,
  UserResponseDto,
} from './dto/admin.dto';
import { AccessStatus } from '../../users/users.schema';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics', description: 'Get overview statistics of all users by access status' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully', type: UserStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getStats(): Promise<UserStatsResponseDto> {
    this.logger.log('Fetching user statistics');
    return this.adminService.getUserStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users', description: 'Get list of all users with optional filtering by access status' })
  @ApiQuery({ name: 'status', required: false, enum: AccessStatus, description: 'Filter by access status' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getUsers(
    @Query('status') status?: AccessStatus,
  ): Promise<UserResponseDto[]> {
    this.logger.log(`Fetching users${status ? ` with status: ${status}` : ''}`);
    return this.adminService.getUsers(status);
  }

  @Get('users/pending')
  @ApiOperation({ summary: 'Get pending users', description: 'Get all users with pending access requests' })
  @ApiResponse({ status: 200, description: 'Pending users retrieved successfully', type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getPendingUsers(): Promise<UserResponseDto[]> {
    this.logger.log('Fetching pending access requests');
    return this.adminService.getPendingUsers();
  }

  @Get('users/approved')
  @ApiOperation({ summary: 'Get approved users', description: 'Get all users with approved access' })
  @ApiResponse({ status: 200, description: 'Approved users retrieved successfully', type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getApprovedUsers(): Promise<UserResponseDto[]> {
    this.logger.log('Fetching approved users');
    return this.adminService.getApprovedUsers();
  }

  @Get('users/:telegramId')
  @ApiOperation({ summary: 'Get specific user', description: 'Get details of a specific user by Telegram ID' })
  @ApiParam({ name: 'telegramId', description: 'Telegram user ID', type: Number })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getUser(
    @Param('telegramId', ParseIntPipe) telegramId: number,
  ): Promise<UserResponseDto> {
    this.logger.log(`Fetching user: ${telegramId}`);
    return this.adminService.getUser(telegramId);
  }

  @Post('users/:telegramId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve user', description: 'Approve a user\'s access request. User will receive a Telegram notification.' })
  @ApiParam({ name: 'telegramId', description: 'Telegram user ID', type: Number })
  @ApiResponse({ status: 200, description: 'User approved successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async approveUser(
    @Param('telegramId', ParseIntPipe) telegramId: number,
  ): Promise<UserResponseDto> {
    this.logger.log(`Approving user: ${telegramId}`);
    return this.adminService.approveUser(telegramId);
  }

  @Post('users/:telegramId/deny')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deny user', description: 'Deny a user\'s access request with a reason. User will receive a Telegram notification.' })
  @ApiParam({ name: 'telegramId', description: 'Telegram user ID', type: Number })
  @ApiResponse({ status: 200, description: 'User denied successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async denyUser(
    @Param('telegramId', ParseIntPipe) telegramId: number,
    @Body() denyDto: DenyUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`Denying user: ${telegramId}`);
    return this.adminService.denyUser(telegramId, denyDto.reason);
  }

  @Post('users/:telegramId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke user access', description: 'Revoke access for a previously approved user. User will receive a Telegram notification.' })
  @ApiParam({ name: 'telegramId', description: 'Telegram user ID', type: Number })
  @ApiResponse({ status: 200, description: 'User access revoked successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async revokeUser(
    @Param('telegramId', ParseIntPipe) telegramId: number,
    @Body() revokeDto: RevokeUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`Revoking user access: ${telegramId}`);
    return this.adminService.revokeUser(telegramId, revokeDto.reason);
  }

  @Post('users/bulk-approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve users', description: 'Approve multiple users at once. Each user receives individual notification.' })
  @ApiResponse({ status: 200, description: 'Bulk approval completed', schema: { properties: { approved: { type: 'number' }, failed: { type: 'number' } } } })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async bulkApproveUsers(
    @Body() body: BulkApproveDto,
  ): Promise<{ approved: number; failed: number }> {
    this.logger.log(`Bulk approving ${body.telegramIds.length} users`);
    return this.adminService.bulkApproveUsers(body.telegramIds);
  }

  @Get('search/users')
  @ApiOperation({ summary: 'Search users', description: 'Search users by username, name, or Telegram ID' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully', type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async searchUsers(@Query('q') query: string): Promise<UserResponseDto[]> {
    this.logger.log(`Searching users with query: ${query}`);
    return this.adminService.searchUsers(query);
  }
}
