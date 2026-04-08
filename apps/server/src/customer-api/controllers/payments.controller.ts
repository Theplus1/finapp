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
import { PaymentSummaryResponseDto } from '../dto/payment-summary.dto';
import { BOSS_AND_ACCOUNTANT_ROLES } from '../../common/constants/auth.constants';
import { parseYyyyMmDdAsUtcDate } from '../../common/utils/date.utils';
import { PaymentSummaryService } from '../../domain/payment-summary/payment-summary.service';
import { RequestUser, validateVaAccess } from '../utils/va-access.util';

@ApiTags('Customer API - Payment')
@ApiBearerAuth()
@Controller('customer-api/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BOSS_AND_ACCOUNTANT_ROLES)
export class CustomerPaymentsController {
  constructor(
    private readonly paymentSummaryService: PaymentSummaryService,
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
    validateVaAccess(req.user, slashId);

    if (!from || !to) {
      throw new BadRequestException('from and to query params are required');
    }

    const fromDate = parseYyyyMmDdAsUtcDate(from);
    const toDate = parseYyyyMmDdAsUtcDate(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }

    if (toDate < fromDate) {
      throw new BadRequestException('to must be greater than or equal to from');
    }
    return this.paymentSummaryService.getRangeSummary(
      slashId,
      fromDate,
      toDate,
      from,
      to,
    );
  }

  @Get(':id/payment-summary/overall')
  @ApiOperation({
    summary: 'Get overall payment summary for a virtual account (all time)',
    description:
      'Returns aggregated totals (deposit/spend/refund/balance) for the entire history of the virtual account.',
  })
  @ApiParam({
    name: 'id',
    description: 'Virtual Account Slash ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Overall payment summary returned successfully',
    type: PaymentSummaryResponseDto,
  })
  async getOverallPaymentSummary(
    @Param('id') slashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{
    virtualAccountId: string;
    currency: string;
    timezone: string;
    summary: {
      totalDepositCents: number;
      totalSpendCents: number;
      totalSpendUsCents: number;
      totalSpendNonUsCents: number;
      totalRefundCents: number;
      endingAccountBalanceCents: number;
    };
  }> {
    validateVaAccess(req.user, slashId);

    return this.paymentSummaryService.getOverallSummary(slashId);
  }
}

