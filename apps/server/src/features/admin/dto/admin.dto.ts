import { IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessStatus } from '../../../users/users.schema';

export class ApproveUserDto {
  @ApiProperty({ description: 'Telegram user ID', example: 123456789 })
  @IsNumber()
  telegramId: number;
}

export class DenyUserDto {
  @ApiProperty({ description: 'Telegram user ID', example: 123456789 })
  @IsNumber()
  telegramId: number;

  @ApiProperty({
    description: 'Reason for denying access',
    example: 'Invalid account information',
  })
  @IsString()
  reason: string;
}

export class RevokeUserDto {
  @ApiProperty({ description: 'Telegram user ID', example: 123456789 })
  @IsNumber()
  telegramId: number;

  @ApiProperty({
    description: 'Reason for revoking access',
    example: 'Suspicious activity detected',
  })
  @IsString()
  reason: string;
}

export class UpdateUserAccessDto {
  @ApiProperty({ description: 'Telegram user ID', example: 123456789 })
  @IsNumber()
  telegramId: number;

  @ApiProperty({
    description: 'New access status',
    enum: AccessStatus,
    example: AccessStatus.APPROVED,
  })
  @IsEnum(AccessStatus)
  accessStatus: AccessStatus;

  @ApiPropertyOptional({
    description: 'Optional reason for status change',
    example: 'Manual review completed',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkApproveDto {
  @ApiProperty({
    description: 'Array of Telegram user IDs to approve',
    example: [123456789, 987654321],
    type: [Number],
  })
  telegramIds: number[];
}

export class UserStatsResponseDto {
  @ApiProperty({ description: 'Total number of users', example: 150 })
  totalUsers: number;

  @ApiProperty({ description: 'Number of pending users', example: 12 })
  pending: number;

  @ApiProperty({ description: 'Number of approved users', example: 130 })
  approved: number;

  @ApiProperty({ description: 'Number of denied users', example: 5 })
  denied: number;

  @ApiProperty({ description: 'Number of revoked users', example: 3 })
  revoked: number;
}

export class UserResponseDto {
  @ApiProperty({ description: 'Telegram user ID', example: 123456789 })
  telegramId: number;

  @ApiPropertyOptional({ description: 'Telegram username', example: 'john_doe' })
  username?: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Virtual account ID', example: 'VA123456' })
  virtualAccountId?: string;

  @ApiProperty({
    description: 'Current access status',
    enum: AccessStatus,
    example: AccessStatus.APPROVED,
  })
  accessStatus: AccessStatus;

  @ApiPropertyOptional({
    description: 'When access was requested',
    example: '2025-10-14T10:30:00.000Z',
  })
  accessRequestedAt?: Date;

  @ApiPropertyOptional({
    description: 'When access was approved',
    example: '2025-10-14T11:00:00.000Z',
  })
  accessApprovedAt?: Date;

  @ApiPropertyOptional({ description: 'Admin who approved access', example: 0 })
  accessApprovedBy?: number;

  @ApiPropertyOptional({
    description: 'Reason for denial or revocation',
    example: 'Invalid information',
  })
  accessDeniedReason?: string;

  @ApiProperty({
    description: 'Whether user is subscribed to notifications',
    example: true,
  })
  isSubscribed: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-10-14T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-10-14T11:00:00.000Z',
  })
  updatedAt: Date;
}
