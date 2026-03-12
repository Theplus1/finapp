import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentSummaryRowDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Total deposit in cents for the day' })
  depositCents: number;

  @ApiProperty({ description: 'Total spend in cents for the day' })
  spendCents: number;

  @ApiProperty({ description: 'Total spend in US in cents for the day' })
  spendUsCents: number;

  @ApiProperty({ description: 'Total spend outside US in cents for the day' })
  spendNonUsCents: number;

  @ApiProperty({ description: 'Total refund in cents for the day' })
  refundCents: number;
}

export class PaymentSummaryResponseDto {
  @ApiProperty({ description: 'Virtual account Slash ID' })
  virtualAccountId: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Timezone label', example: 'local' })
  timezone: string;

  @ApiProperty({
    description: 'Date range (inclusive) in YYYY-MM-DD format',
  })
  range: {
    from: string;
    to: string;
  };

  @ApiPropertyOptional({ description: 'Rows per day in range', type: [PaymentSummaryRowDto] })
  rows: PaymentSummaryRowDto[];

  @ApiProperty({
    description: 'Summary totals for the given range',
  })
  summary: {
    totalDepositCents: number;
    totalSpendCents: number;
    totalSpendUsCents: number;
    totalSpendNonUsCents: number;
    totalRefundCents: number;
    endingAccountBalanceCents: number;
  };
}

