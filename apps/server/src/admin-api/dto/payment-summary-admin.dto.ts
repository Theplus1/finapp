import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentSummaryAdminRowDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Total deposit in cents for the day' })
  depositCents: number;

  @ApiProperty({ description: 'Total spend in cents (pending + settled) for the day' })
  spendCents: number;

  @ApiProperty({ description: 'Total spend in US cents (pending + settled) for the day' })
  spendUsCents: number;

  @ApiProperty({
    description: 'Total spend in Non-US cents (pending + settled) for the day',
  })
  spendNonUsCents: number;

  @ApiProperty({ description: 'Total spend in cents (settled only) for the day' })
  spendCentsForAdmin: number;

  @ApiProperty({ description: 'Total spend in US cents (settled only) for the day' })
  spendUsCentsForAdmin: number;

  @ApiProperty({
    description: 'Total spend in Non-US cents (settled only) for the day',
  })
  spendNonUsCentsForAdmin: number;

  @ApiProperty({ description: 'Total refund in cents for the day' })
  refundCents: number;
}

export class PaymentSummaryAdminSummaryDto {
  @ApiProperty({ description: 'Total deposit in cents for the range' })
  totalDepositCents: number;

  @ApiProperty({
    description: 'Total spend in cents (pending + settled) for the range',
  })
  totalSpendCents: number;

  @ApiProperty({
    description: 'Total spend in US cents (pending + settled) for the range',
  })
  totalSpendUsCents: number;

  @ApiProperty({
    description: 'Total spend in Non-US cents (pending + settled) for the range',
  })
  totalSpendNonUsCents: number;

  @ApiProperty({
    description: 'Total spend in cents (settled only) for the range',
  })
  totalSpendCentsForAdmin: number;

  @ApiProperty({
    description: 'Total spend in US cents (settled only) for the range',
  })
  totalSpendUsCentsForAdmin: number;

  @ApiProperty({
    description:
      'Total spend in Non-US cents (settled only) for the range',
  })
  totalSpendNonUsCentsForAdmin: number;

  @ApiProperty({ description: 'Total refund in cents for the range' })
  totalRefundCents: number;

  @ApiProperty({
    description:
      'Ending account balance in cents computed with settled-only spend',
  })
  endingAccountBalanceCentsForAdmin: number;

  @ApiProperty({
    description:
      'Ending account balance in cents computed with pending + settled spend',
  })
  endingAccountBalanceCents: number;
}

export class PaymentSummaryAdminResponseDto {
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

  @ApiPropertyOptional({
    description: 'Rows per day in range',
    type: [PaymentSummaryAdminRowDto],
  })
  rows: PaymentSummaryAdminRowDto[];

  @ApiProperty({ description: 'Summary totals for the given range' })
  summary: PaymentSummaryAdminSummaryDto;
}

export class PaymentSummaryAdminOverallResponseDto {
  @ApiProperty({ description: 'Virtual account Slash ID' })
  virtualAccountId: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Timezone label', example: 'local' })
  timezone: string;

  @ApiProperty({ description: 'Aggregated summary totals' })
  summary: PaymentSummaryAdminSummaryDto;
}

