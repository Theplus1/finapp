import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../admin-api/guards/jwt-auth.guard';
import { RolesGuard } from '../../admin-api/guards/roles.guard';
import { Roles } from '../../admin-api/decorators/roles.decorator';
import { TransactionsService } from '../../domain/transactions/transactions.service';
import { CardSpendResponseDto } from '../dto/card-spend.dto';
import { format, startOfDay, endOfDay } from 'date-fns';
import { BOSS_AND_ACCOUNTANT_ROLES } from '../../common/constants/auth.constants';

interface RequestUser {
  userId: string;
  username: string;
  role: string;
  virtualAccountId?: string;
  bossId?: string;
}

@ApiTags('Customer API - Card Spend')
@ApiBearerAuth()
@Controller('customer-api/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BOSS_AND_ACCOUNTANT_ROLES)
export class CustomerCardSpendController {
  constructor(
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get(':id/card-spend')
  @ApiOperation({
    summary: 'Get card spend pivot (Card x Date) for a virtual account',
    description:
      'Returns data to build a table similar to the Card sheet in Google Sheets (rows per card, columns per date, plus a Total row).',
  })
  @ApiParam({
    name: 'id',
    description: 'Virtual Account Slash ID',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Card spend pivot returned successfully',
    type: CardSpendResponseDto,
  })
  async getCardSpend(
    @Param('id') slashId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: { user?: RequestUser },
  ): Promise<CardSpendResponseDto> {
    const vaIdFromToken = req.user?.virtualAccountId;
    if (!vaIdFromToken) {
      throw new BadRequestException('No virtual account linked to this user');
    }
    if (vaIdFromToken !== slashId) {
      throw new BadRequestException(
        'You can only access card spend for your own virtual account',
      );
    }

    if (!from || !to) {
      throw new BadRequestException('from and to query params are required');
    }

    const fromDateRaw = new Date(from);
    const toDateRaw = new Date(to);
    if (Number.isNaN(fromDateRaw.getTime()) || Number.isNaN(toDateRaw.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }
    const fromDate = startOfDay(fromDateRaw);
    const toDate = endOfDay(toDateRaw);
    if (toDate < fromDate) {
      throw new BadRequestException('to must be greater than or equal to from');
    }

    // Lấy transactions PENDING + SETTLED trong range, có cardId
    const transactions = await this.transactionsService.findAllWithFilters({
      virtualAccountId: slashId,
      detailedStatus: { $in: ['pending', 'settled'] },
      startDate: fromDate.toISOString(),
      endDate: toDate.toISOString(),
    });

    // Gom các ngày có giao dịch
    const daySet = new Set<string>();
    // Map cardId -> { cardName, daySpendCents: Record<date, cents> }
    const perCard = new Map<
      string,
      { cardName: string; daySpendCents: Record<string, number> }
    >();

    for (const tx of transactions) {
      const cardId = tx.cardId;
      if (!cardId) continue;

      const txDate = tx.date ? new Date(tx.date) : null;
      if (!txDate) continue;
      const dayKey = format(startOfDay(txDate), 'yyyy-MM-dd');
      daySet.add(dayKey);

      const amountCents = Math.abs(tx.amountCents || 0);

      // cardName từ enriched card (nếu có), fallback cardId
      const cardName =
        (tx as any).card?.name ??
        (tx as any).card?.slashId ??
        cardId;

      const existing =
        perCard.get(cardId) ??
        {
          cardName,
          daySpendCents: {} as Record<string, number>,
        };

      existing.daySpendCents[dayKey] =
        (existing.daySpendCents[dayKey] ?? 0) + amountCents;

      perCard.set(cardId, existing);
    }

    // Sort days tăng dần
    const days = Array.from(daySet.values()).sort();

    // Build rows per card
    const rows = Array.from(perCard.entries()).map(([cardId, data]) => {
      const daySpendCents: Record<string, number> = {} as Record<string, number>;
      let totalSpendCents = 0;
      for (const day of days) {
        const value = data.daySpendCents[day] ?? 0;
        daySpendCents[day] = value;
        totalSpendCents += value;
      }
      return {
        cardId,
        cardName: data.cardName,
        isTotal: false,
        daySpendCents,
        totalSpendCents,
      };
    });

    // Thêm row Total
    const totalDaySpend: Record<string, number> = {} as Record<string, number>;
    let totalRowSum = 0;
    for (const day of days) {
      const sumForDay = rows.reduce(
        (acc, row) => acc + (row.daySpendCents[day] ?? 0),
        0,
      );
      totalDaySpend[day] = sumForDay;
      totalRowSum += sumForDay;
    }
    rows.push({
      cardId: null as any,
      cardName: 'Total',
      isTotal: true,
      daySpendCents: totalDaySpend,
      totalSpendCents: totalRowSum,
    });

    // currency: lấy tạm từ transaction đầu tiên nếu có, fallback 'USD'
    const currency = (transactions[0] as any)?.originalCurrency?.code ?? 'USD';

    return {
      virtualAccountId: slashId,
      currency,
      timezone: 'local',
      range: { from, to },
      days,
      rows,
    };
  }
}

