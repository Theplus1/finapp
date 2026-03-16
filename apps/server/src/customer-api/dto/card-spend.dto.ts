import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CardSpendRowDto {
  @ApiPropertyOptional({ description: 'Card Slash ID, null for total row' })
  cardId: string | null;

  @ApiProperty({ description: 'Card name or \"Total\" row label' })
  cardName: string;

  @ApiPropertyOptional({
    description: 'Last 4 digits of the card number, empty for total row',
    example: '1234',
  })
  cardLast4?: string;

  @ApiProperty({ description: 'Whether this row is the total row' })
  isTotal: boolean;

  @ApiProperty({
    description:
      'Map from date (YYYY-MM-DD) to spend amount in cents for that date',
    example: { '2025-12-11': 12300, '2025-12-12': 45600 },
  })
  daySpendCents: Record<string, number>;

  @ApiProperty({ description: 'Total spend in cents for this card in range' })
  totalSpendCents: number;
}

export class CardSpendResponseDto {
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

  @ApiProperty({
    description: 'List of dates (YYYY-MM-DD) representing columns',
    example: ['2025-12-11', '2025-12-12'],
  })
  days: string[];

  @ApiProperty({
    description:
      'Rows per card and a final total row. FE có thể dựng bảng giống sheet Card dựa trên days + rows',
    type: [CardSpendRowDto],
  })
  rows: CardSpendRowDto[];
}

