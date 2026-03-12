import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { UsersService } from 'src/users/users.service';
import { ADMIN_API_ROLES } from '../../common/constants/auth.constants';

@ApiTags('Admin API - Users')
@ApiBearerAuth()
@Controller('admin-api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_API_ROLES)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list() {
    this.logger.log('Listing virtual accounts');

    const data = await this.usersService.getAllUsers();

    return {
      data,
      pagination: {
        total: data.length,
      },
    };
  }
}
