import { IsString, IsNotEmpty, MinLength, IsEnum, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ADMIN_USER_ROLES, type AdminUserRole } from '../../database/schemas/admin-user.schema';

export class CreateAdminDto {
  @ApiProperty({ description: 'Admin username', example: 'john.doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: 'Admin password', example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ 
    description: 'Admin role', 
    enum: ADMIN_USER_ROLES,
    example: 'admin',
    default: 'admin'
  })
  @IsEnum(ADMIN_USER_ROLES)
  @IsOptional()
  role?: AdminUserRole;

  @ApiPropertyOptional({ description: 'Admin email', example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Slash virtual account id (for boss/employee)', example: 'subaccount_...' })
  @IsString()
  @IsOptional()
  virtualAccountId?: string;

  @ApiPropertyOptional({ description: 'Boss id (for employee accounts)', example: '...' })
  @IsString()
  @IsOptional()
  bossId?: string;
}

export class AdminUserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Role', enum: ADMIN_USER_ROLES })
  role: string;

  @ApiProperty({ description: 'Email', required: false })
  email?: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Last login time', required: false })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Primary virtual account id', required: false })
  virtualAccountId?: string;

  @ApiProperty({ description: 'All virtual account ids (boss)', required: false, isArray: true })
  virtualAccountIds?: string[];

  @ApiProperty({ description: 'Boss id (for employee accounts)', required: false })
  bossId?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class UpdatePasswordDto {
  @ApiProperty({ description: 'New password', example: 'NewSecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
