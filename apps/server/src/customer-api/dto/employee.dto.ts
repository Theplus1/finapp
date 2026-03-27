import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsEmail,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const EMPLOYEE_ROLES = ['ads', 'accountant'] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Username', example: 'nv.ads.1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: 'Password', example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Role',
    enum: EMPLOYEE_ROLES,
    example: 'ads',
  })
  @IsEnum(EMPLOYEE_ROLES)
  role: EmployeeRole;

  @ApiPropertyOptional({ description: 'Email', example: 'nv@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'Username', example: 'nv.ads.2' })
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
    description: 'Role',
    enum: EMPLOYEE_ROLES,
    example: 'accountant',
  })
  @IsEnum(EMPLOYEE_ROLES)
  @IsOptional()
  role?: EmployeeRole;
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

  @ApiProperty({ description: 'Role', enum: EMPLOYEE_ROLES })
  role: string;

  @ApiPropertyOptional({ description: 'Email' })
  email?: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

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
