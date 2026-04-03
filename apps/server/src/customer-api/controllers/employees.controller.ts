import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../admin-api/guards/jwt-auth.guard';
import { Roles } from '../../admin-api/decorators/roles.decorator';
import { RolesGuard } from '../../admin-api/guards/roles.guard';
import { AdminUsersService } from '../../domain/admin-users/admin-users.service';
import { BOSS_ONLY_ROLES } from '../../common/constants/auth.constants';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  SetEmployeeActiveDto,
} from '../dto/employee.dto';
import type { AdminUserDocument } from '../../database/schemas/admin-user.schema';

interface RequestUser {
  userId: string;
  username: string;
  role: string;
  bossId?: string;
  virtualAccountId?: string;
}

function toEmployeeResponse(doc: AdminUserDocument): EmployeeResponseDto {
  return {
    id: (doc._id as unknown as { toString(): string }).toString(),
    username: doc.username,
    role: doc.role,
    email: doc.email,
    isActive: doc.isActive,
    lastLoginAt: doc.lastLoginAt,
    bossId: doc.bossId,
    virtualAccountId: doc.virtualAccountId,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

@ApiTags('Customer API - Employees')
@ApiBearerAuth()
@Controller('customer-api/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BOSS_ONLY_ROLES)
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List employees of the current boss' })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Boss only' })
  async list(@Request() req: { user?: RequestUser }): Promise<{
    data: EmployeeResponseDto[];
  }> {
    const bossId = req.user?.userId;
    if (!bossId) {
      throw new Error('User context missing');
    }
    const employees = await this.adminUsersService.findEmployeesByBossId(bossId);
    return {
      data: employees.map((e) => toEmployeeResponse(e as AdminUserDocument)),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new employee (ads or accountant)' })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - username taken or invalid role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Boss only' })
  async create(
    @Body() dto: CreateEmployeeDto,
    @Request() req: { user?: RequestUser },
  ): Promise<EmployeeResponseDto> {
    const bossId = req.user?.userId;
    if (!bossId) {
      throw new Error('User context missing');
    }
    this.logger.log(`Boss ${req.user?.username} creating employee ${dto.username}`);
    const employee = await this.adminUsersService.createEmployee(
      bossId,
      dto.username,
      dto.password,
      dto.role,
      dto.email,
    );
    return toEmployeeResponse(employee as AdminUserDocument);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee (username, email, role)' })
  @ApiParam({ name: 'id', description: 'Employee user ID' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not your employee' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Request() req: { user?: RequestUser },
  ): Promise<EmployeeResponseDto> {
    const bossId = req.user?.userId;
    if (!bossId) {
      throw new Error('User context missing');
    }
    this.logger.log(`Boss ${req.user?.username} updating employee ${id}`);
    const updated = await this.adminUsersService.updateEmployee(id, bossId, {
      username: dto.username,
      email: dto.email,
      role: dto.role,
    });
    return toEmployeeResponse(updated as AdminUserDocument);
  }

  @Patch(':id/active')
  @ApiOperation({
    summary: 'Set employee active status (deactivate/reactivate)',
    description:
      'Set employee isActive to true/false. This does not remove the record; list will show both active and inactive employees.',
  })
  @ApiParam({ name: 'id', description: 'Employee user ID' })
  @ApiBody({ type: SetEmployeeActiveDto })
  @ApiResponse({ status: 200, description: 'Employee status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your employee' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async setActive(
    @Param('id') id: string,
    @Body() dto: SetEmployeeActiveDto,
    @Request() req: { user?: RequestUser },
  ): Promise<EmployeeResponseDto> {
    const bossId = req.user?.userId;
    if (!bossId) {
      throw new Error('User context missing');
    }
    this.logger.log(
      `Boss ${req.user?.username} setting employee ${id} isActive=${dto.isActive}`,
    );
    const updated = await this.adminUsersService.setEmployeeActive(
      id,
      bossId,
      dto.isActive,
    );
    return toEmployeeResponse(updated as AdminUserDocument);
  }

  @Post(':id/reset-password')
  @ApiOperation({
    summary: 'Reset employee password to a random value (boss only)',
  })
  @ApiParam({ name: 'id', description: 'Employee user ID' })
  @ApiResponse({
    status: 200,
    description:
      'Employee password reset successfully. New password is returned once.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not your employee' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async resetPassword(
    @Param('id') id: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ id: string; username: string; newPassword: string }> {
    const bossId = req.user?.userId;
    if (!bossId) {
      throw new Error('User context missing');
    }
    this.logger.log(
      `Boss ${req.user?.username} resetting password for employee ${id}`,
    );
    const result =
      await this.adminUsersService.resetEmployeePasswordRandom(id, bossId);
    return result;
  }
}
