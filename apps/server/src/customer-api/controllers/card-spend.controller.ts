import {
  BadRequestException,
  Controller,
  Get,
  Post,
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
import { CUSTOMER_API_ROLES } from '../../common/constants/auth.constants';
import { ExportsService } from '../../domain/exports/exports.service';
import { RequestUser, validateVaAccess, getVaIdFromToken } from '../utils/va-access.util';
import { requirePermission } from '../utils/permissions.util';

@ApiTags('Customer API - Card Spend')
@ApiBearerAuth()
@Controller('customer-api/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CUSTOMER_API_ROLES)
export class CustomerCardSpendController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly exportsService: ExportsService,
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
    requirePermission(req.user, 'card_spend');
    validateVaAccess(req.user, slashId);

    if (!from || !to) {
      throw new BadRequestException('from and to query params are required');
    }

    const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!dayPattern.test(from) || !dayPattern.test(to)) {
      throw new BadRequestException('from/to must be in YYYY-MM-DD format');
    }

    const fromDateRaw = new Date(`${from}T00:00:00.000Z`);
    const toDateRaw = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(fromDateRaw.getTime()) || Number.isNaN(toDateRaw.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }
    const fromDate = fromDateRaw;
    const toDate = toDateRaw;
    if (toDate < fromDate) {
      throw new BadRequestException('to must be greater than or equal to from');
    }

    const aggregated = await this.transactionsService.aggregateCardSpendByCardAndDay({
      virtualAccountId: slashId,
      detailedStatuses: ['pending', 'settled'],
      startDate: fromDate,
      endDate: toDate,
    });

    const daySet = new Set<string>();
    const perCard = new Map<
      string,
      {
        cardName: string;
        cardLast4?: string;
        daySpendCents: Record<string, number>;
      }
    >();

    for (const item of aggregated.rows) {
      daySet.add(item.day);
      const existing =
        perCard.get(item.cardId) ??
        {
          cardName: item.cardName,
          cardLast4: item.cardLast4,
          daySpendCents: {} as Record<string, number>,
        };

      if (!existing.cardLast4 && item.cardLast4) {
        existing.cardLast4 = item.cardLast4;
      }

      existing.daySpendCents[item.day] =
        (existing.daySpendCents[item.day] ?? 0) + item.amountCents;

      perCard.set(item.cardId, existing);
    }

    const days = Array.from(daySet.values()).sort();

    const rows: CardSpendResponseDto['rows'] = Array.from(
      perCard.entries(),
    ).map(([cardId, data]) => {
      const daySpendCents: Record<string, number> = {} as Record<
        string,
        number
      >;
      let totalSpendCents = 0;
      for (const day of days) {
        const value = data.daySpendCents[day] ?? 0;
        daySpendCents[day] = value;
        totalSpendCents += value;
      }
      return {
        cardId,
        cardName: data.cardName,
        cardLast4: data.cardLast4,
        isTotal: false,
        daySpendCents,
        totalSpendCents,
      };
    });

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
      cardId: null,
      cardName: 'Total',
      cardLast4: undefined,
      isTotal: true,
      daySpendCents: totalDaySpend,
      totalSpendCents: totalRowSum,
    });

    const currency = aggregated.currency ?? 'USD';

    return {
      virtualAccountId: slashId,
      currency,
      timezone: 'UTC',
      range: { from, to },
      days,
      rows,
    };
  }

  @Post('card-spend/export')
  @ApiOperation({
    summary: 'Export card spend pivot to Excel (boss/accountant)',
    description:
      'Exports the same pivot structure as card-spend web table with Total row first.',
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
    description: 'Card spend export generated successfully',
  })
  async exportCardSpend(
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: Date;
  }> {
    requirePermission(req.user, 'card_spend');
    const vaIdFromToken = getVaIdFromToken(req.user);

    if (!from || !to) {
      throw new BadRequestException('from and to query params are required');
    }

    const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!dayPattern.test(from) || !dayPattern.test(to)) {
      throw new BadRequestException('from/to must be in YYYY-MM-DD format');
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Missing user ID for export');
    }

    return this.exportsService.generateCardSpendExportDownloadUrlForWeb({
      userId,
      virtualAccountId: vaIdFromToken,
      from,
      to,
    });
  }
}

