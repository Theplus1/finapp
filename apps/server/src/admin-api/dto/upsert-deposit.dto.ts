import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpsertDepositDto {
  @ApiProperty({
    description: 'Date for the deposit (YYYY-MM-DD)',
    example: '2025-12-11',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in format YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({
    description: 'Deposit amount in USD (major units) for the day',
    example: 123.45,
  })
  @IsNumber()
  @Min(0)
  depositAmount: number;
}

