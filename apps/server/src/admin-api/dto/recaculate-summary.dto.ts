import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class RecalculateDailySummaryDto {
  @ApiProperty({
    description: 'Start date',
    example: '2025-12-23T00:00:00.000Z'
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date',
    example: '2025-12-23T23:59:59.999Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Virtual account ID',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  virtualAccountId: string;
}
