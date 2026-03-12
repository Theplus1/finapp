import { IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const LIMIT_PRESETS = ['daily', 'weekly', 'monthly', 'yearly', 'collective'] as const;
export type LimitPreset = (typeof LIMIT_PRESETS)[number];

export class SetCardLimitDto {
  @ApiProperty({
    description: 'Limit period',
    enum: LIMIT_PRESETS,
    example: 'daily',
  })
  @IsEnum(LIMIT_PRESETS)
  preset: LimitPreset;

  @ApiProperty({
    description: 'Spending limit amount in USD',
    example: 100,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least 0.01 USD' })
  amount: number;
}
