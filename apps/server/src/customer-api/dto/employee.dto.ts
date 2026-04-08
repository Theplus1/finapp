import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EMPLOYEE_PERMISSIONS } from '../../database/schemas/admin-user.schema';

export const EMPLOYEE_PERMISSIONS_LIST = [...EMPLOYEE_PERMISSIONS];

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Username', example: 'nv.1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: 'Password', example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Email', example: 'nv@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Permissions',
    enum: EMPLOYEE_PERMISSIONS_LIST,
    isArray: true,
    example: ['transactions', 'card_list_own'],
  })
  @IsArray()
  @IsIn(EMPLOYEE_PERMISSIONS_LIST, { each: true })
  permissions: string[];

  @ApiPropertyOptional({ description: 'VA ID to assign (for boss with multiple VAs)' })
  @IsString()
  @IsOptional()
  virtualAccountId?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'Username', example: 'nv.2' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'nv@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Permissions',
    enum: EMPLOYEE_PERMISSIONS_LIST,
    isArray: true,
  })
  @IsArray()
  @IsIn(EMPLOYEE_PERMISSIONS_LIST, { each: true })
  @IsOptional()
  permissions?: string[];
}

export class SetEmployeeActiveDto {
  @ApiProperty({ description: 'Active status', example: true })
  @IsBoolean()
  isActive: boolean;
}

export class EmployeeResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Role' })
  role: string;

  @ApiPropertyOptional({ description: 'Email' })
  email?: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Permissions', isArray: true })
  permissions: string[];

  @ApiPropertyOptional({ description: 'Last login time' })
  lastLoginAt?: Date;

  @ApiPropertyOptional({ description: 'Boss id' })
  bossId?: string;

  @ApiPropertyOptional({ description: 'Virtual account id' })
  virtualAccountId?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
