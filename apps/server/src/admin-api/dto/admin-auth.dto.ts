import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ADMIN_USER_ROLES } from '../../database/schemas/admin-user.schema';
import { AUTH_AUDIENCE_TYPES, type AuthAudienceType } from '../../common/constants/auth.constants';

export class AdminLoginDto {
  @ApiProperty({ description: 'Admin username', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Admin password', example: 'your-secure-password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class AdminLoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Token expiration time in seconds', example: 86400 })
  expiresIn: number;

  @ApiProperty({ description: 'Admin username' })
  username: string;

  @ApiProperty({ description: 'User role', enum: ADMIN_USER_ROLES })
  role: string;

  @ApiProperty({ description: 'Token audience type', enum: AUTH_AUDIENCE_TYPES })
  type: AuthAudienceType;

  @ApiProperty({ description: 'Slash virtual account id (for boss/employee)', required: false })
  virtualAccountId?: string;

  @ApiProperty({ description: 'Boss id (for employee accounts)', required: false })
  bossId?: string;
}

export class AdminProfileDto {
  @ApiProperty({ description: 'Admin user ID' })
  id: string;

  @ApiProperty({ description: 'Admin username' })
  username: string;

  @ApiProperty({ description: 'User role', enum: ADMIN_USER_ROLES })
  role: string;

  @ApiProperty({ description: 'Slash virtual account id (for boss/employee)', required: false })
  virtualAccountId?: string;

  @ApiProperty({ description: 'Boss id (for employee accounts)', required: false })
  bossId?: string;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;
}
