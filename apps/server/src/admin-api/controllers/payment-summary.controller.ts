import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
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
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ADMIN_API_ROLES } from '../../common/constants/auth.constants';
import { parseYyyyMmDdAsUtcDate } from '../../common/utils/date.utils';
import { PaymentSummaryService } from '../../domain/payment-summary/payment-summary.service';
import type {
  PaymentSummaryAdminOverallResponseDto,
  PaymentSummaryAdminResponseDto,
} from '../dto/payment-summary-admin.dto';
import {
  PaymentSummaryAdminOverallResponseDto as PaymentSummaryAdminOverallResponseDtoClass,
  PaymentSummaryAdminResponseDto as PaymentSummaryAdminResponseDtoClass,
} from '../dto/payment-summary-admin.dto';

@ApiTags('Admin API - Payment Summary')
@ApiBearerAuth()
@Controller('admin-api/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_API_ROLES)
export class PaymentSummaryController {
  constructor(
    private readonly paymentSummaryService: PaymentSummaryService,
  ) {}

  @Get(':virtualAccountId/payment-summary')
  @ApiOperation({
    summary: 'Get payment summary (settled-only spend) for a virtual account',
    description:
      'Returns daily deposit/spend/refund and summary totals for the given date range. Spend totals are settled-only.',
  })
  @ApiParam({
    name: 'virtualAccountId',
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
    type: PaymentSummaryAdminResponseDtoClass,
  })
  async getPaymentSummaryForAdmin(
    @Param('virtualAccountId') virtualAccountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<PaymentSummaryAdminResponseDto> {
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

    return this.paymentSummaryService.getRangeSummaryForAdmin(
      virtualAccountId,
      fromDate,
      toDate,
      from,
      to,
    );
  }

  @Get(':virtualAccountId/payment-summary/overall')
  @ApiOperation({
    summary: 'Get overall payment summary (settled-only spend) for a virtual account',
    description:
      'Returns aggregated totals (deposit/spend/refund/balance) for the entire history of the virtual account. Spend totals are settled-only.',
  })
  @ApiParam({
    name: 'virtualAccountId',
    description: 'Virtual Account Slash ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Overall payment summary returned successfully',
    type: PaymentSummaryAdminOverallResponseDtoClass,
  })
  async getOverallPaymentSummaryForAdmin(
    @Param('virtualAccountId') virtualAccountId: string,
  ): Promise<PaymentSummaryAdminOverallResponseDto> {
    return this.paymentSummaryService.getOverallSummaryForAdmin(
      virtualAccountId,
    );
  }
}

