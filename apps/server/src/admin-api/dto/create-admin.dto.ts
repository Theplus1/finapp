import { IsString, IsNotEmpty, MinLength, IsEnum, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    enum: ['admin', 'super-admin'],
    example: 'admin',
    default: 'admin'
  })
  @IsEnum(['admin', 'super-admin'])
  @IsOptional()
  role?: 'admin' | 'super-admin';

  @ApiPropertyOptional({ description: 'Admin email', example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class AdminUserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Role', enum: ['admin', 'super-admin'] })
  role: string;

  @ApiProperty({ description: 'Email', required: false })
  email?: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Last login time', required: false })
  lastLoginAt?: Date;

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
