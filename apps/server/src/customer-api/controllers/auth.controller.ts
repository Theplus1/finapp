import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthService } from '../../admin-api/services/admin-auth.service';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
} from '../../admin-api/dto/admin-auth.dto';
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
}

