import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
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
import { DailyPaymentSummariesService } from '../../domain/daily-payment-summaries/daily-payment-summaries.service';
import { PaymentSummaryResponseDto } from '../dto/payment-summary.dto';
import { format } from 'date-fns';
import { BOSS_AND_ACCOUNTANT_ROLES } from '../../common/constants/auth.constants';
import { parseYyyyMmDdAsLocalDate } from '../../common/utils/date.utils';

interface RequestUser {
  userId: string;
  username: string;
  role: string;
  virtualAccountId?: string;
  bossId?: string;
}

@ApiTags('Customer API - Payment')
@ApiBearerAuth()
@Controller('customer-api/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BOSS_AND_ACCOUNTANT_ROLES)
export class CustomerPaymentsController {
  constructor(
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
  ) {}

  @Get(':id/payment-summary')
  @ApiOperation({
    summary: 'Get payment summary for a virtual account',
    description:
      'Returns daily deposit/spend/refund and summary totals for the given date range',
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
    description: 'Payment summary returned successfully',
    type: PaymentSummaryResponseDto,
  })
  async getPaymentSummary(
    @Param('id') slashId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: { user?: RequestUser },
  ): Promise<PaymentSummaryResponseDto> {
    const vaIdFromToken = req.user?.virtualAccountId;
    if (!vaIdFromToken) {
      throw new BadRequestException('No virtual account linked to this user');
    }

    if (vaIdFromToken !== slashId) {
      throw new BadRequestException(
        'You can only access payment summary for your own virtual account',
      );
    }

    if (!from || !to) {
      throw new BadRequestException('from and to query params are required');
    }

    // Parse as LOCAL date to match how daily summaries are normalized/stored (GGS behavior)
    const fromDate = parseYyyyMmDdAsLocalDate(from);
    const toDate = parseYyyyMmDdAsLocalDate(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }

    if (toDate < fromDate) {
      throw new BadRequestException('to must be greater than or equal to from');
    }
    console.log('fromDate', fromDate);
    console.log('toDate', toDate);
    const summaries =
      await this.dailyPaymentSummariesService.getDailySummaries(
        slashId,
        fromDate,
        toDate,
      );
    console.log('summaries', summaries);
    const rows = summaries.map((s) => {
      const dateStr = format(s.date, 'yyyy-MM-dd');
      const spendUsCents = s.totalSpendUSCents ?? 0;
      const spendNonUsCents = s.totalSpendNonUSCents ?? 0;
      const spendCents = spendUsCents + spendNonUsCents;
      const refundCents = s.totalRefundCents ?? 0;

      return {
        date: dateStr,
        depositCents: s.totalDepositCents ?? 0,
        spendCents,
        spendUsCents,
        spendNonUsCents,
        refundCents,
      };
    });

    const currency = summaries[0]?.currency ?? 'USD';

    const totalDepositCents = rows.reduce(
      (acc, r) => acc + (r.depositCents ?? 0),
      0,
    );
    const totalSpendUsCents = rows.reduce(
      (acc, r) => acc + (r.spendUsCents ?? 0),
      0,
    );
    const totalSpendNonUsCents = rows.reduce(
      (acc, r) => acc + (r.spendNonUsCents ?? 0),
      0,
    );
    const totalSpendCents = totalSpendUsCents + totalSpendNonUsCents;
    const totalRefundCents = rows.reduce(
      (acc, r) => acc + (r.refundCents ?? 0),
      0,
    );

    const endingAccountBalanceCents =
      totalDepositCents - totalSpendCents + totalRefundCents;

    return {
      virtualAccountId: slashId,
      currency,
      timezone: 'local',
      range: {
        from,
        to,
      },
      rows,
      summary: {
        totalDepositCents,
        totalSpendCents,
        totalSpendUsCents,
        totalSpendNonUsCents,
        totalRefundCents,
        endingAccountBalanceCents,
      },
    };
  }
}

