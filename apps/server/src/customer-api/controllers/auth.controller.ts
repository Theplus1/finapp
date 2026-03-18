import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
  ForbiddenException,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminAuthService } from '../../admin-api/services/admin-auth.service';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
} from '../../admin-api/dto/admin-auth.dto';
import { UpdatePasswordDto } from '../../admin-api/dto/create-admin.dto';
import { JwtAuthGuard } from '../../admin-api/guards/jwt-auth.guard';
import { isAdminApiRole } from '../../common/constants/auth.constants';

@ApiTags('Customer API - Authentication')
@Controller('customer-api/auth')
export class CustomerAuthController {
  private readonly logger = new Logger(CustomerAuthController.name);

  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Customer login',
    description:
      'Authenticate customer (boss/employee) and receive JWT token. Uses same logic as admin-api/auth/login.',
  })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account is for admin portal' })
  async login(
    @Body() body: AdminLoginDto,
  ): Promise<AdminLoginResponseDto> {
    const user = await this.adminAuthService.validateUser(
      body.username,
      body.password,
    );

    if (!user) {
      this.logger.warn(
        `Customer login failed for username: ${body.username}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (isAdminApiRole(user.role)) {
      throw new ForbiddenException(
        'This account must sign in via the admin portal.',
      );
    }

    this.logger.log(`Customer login successful for user: ${body.username}`);
    return this.adminAuthService.login(user);
  }

  @Patch('users/:username/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update customer password',
    description: 'Update password for a user (super-admin or self). Logic is shared with admin-api.',
  })
  @ApiParam({ name: 'username', description: 'Username of the user' })
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

    await this.adminAuthService.updatePassword(
      username,
      updatePasswordDto.newPassword,
    );

    this.logger.log(`Password updated (customer-api) for user: ${username}`);

    return { username, updated: true };
  }
}

