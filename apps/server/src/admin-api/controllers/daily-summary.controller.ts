import { Controller, Param, Post, Logger, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DailyPaymentSummariesService } from 'src/domain/daily-payment-summaries/daily-payment-summaries.service';
import { RecalculateDailySummaryDto } from '../dto/recaculate-summary.dto';
import { SuperAdminAuthGuard } from '../guards/super-admin-auth.guard';
import { TransactionsService } from 'src/domain/transactions/transactions.service';
import { AccountsService } from 'src/domain/accounts/accounts.service';

@ApiTags('Internal API - Daily Summary')
@ApiBearerAuth()
@Controller('internal-api/daily-summary')
export class DailySummaryController {
    private readonly logger = new Logger(DailySummaryController.name);

    constructor(
        private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
    ) { }

    @Post('recalculate')
    @UseGuards(SuperAdminAuthGuard)
    @ApiOperation({ summary: 'Recalculate daily summary' })
    @ApiResponse({ status: 200, description: 'Daily summary recalculated successfully' })
    @ApiResponse({ status: 404, description: 'Daily summary not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Super admin access required' })
    async recalculate(@Body() body: RecalculateDailySummaryDto) {
        this.logger.log(`Recalculating daily summary for account ${body.virtualAccountId} from ${body.startDate} to ${body.endDate}`);
        return this.dailyPaymentSummariesService.recalculateSummariesForRange(
            body.virtualAccountId, 
            new Date(body.startDate), 
            new Date(body.endDate)
        );
    }

    @Post('recalculate-from-first/:virtualAccountId')
    @UseGuards(SuperAdminAuthGuard)
    @ApiOperation({
      summary:
        'Recalculate daily summaries from the first transaction date for a virtual account',
    })
    @ApiParam({
      name: 'virtualAccountId',
      description: 'Virtual Account Slash ID',
    })
    @ApiResponse({
      status: 200,
      description: 'Daily summaries recalculated successfully from first date',
    })
    @ApiResponse({
      status: 404,
      description: 'Virtual account or transactions not found',
    })
    @ApiResponse({
      status: 403,
      description: 'Forbidden - Super admin access required',
    })
    async recalculateFromFirst(
      @Param('virtualAccountId') virtualAccountId: string,
    ) {
      this.logger.log(
        `Recalculating daily summaries from first transaction for VA ${virtualAccountId}`,
      );

      const account = await this.accountsService.findBySlashId(virtualAccountId);

      const firstTx =
        await this.transactionsService.findFirstByVirtualAccountId(
          virtualAccountId,
        );
      if (!firstTx || !firstTx.date) {
        this.logger.warn(
          `No transactions found for virtual account ${virtualAccountId}. Nothing to recalculate.`,
        );
        return {
          success: true,
          virtualAccountId,
          message: 'No transactions found. No summaries were recalculated.',
        };
      }

      const firstDateUtc = new Date(Date.UTC(
        firstTx.date.getUTCFullYear(),
        firstTx.date.getUTCMonth(),
        firstTx.date.getUTCDate(),
        0, 0, 0, 0,
      ));

      const now = new Date();
      const todayUtc = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0,
      ));

      await this.dailyPaymentSummariesService.recalculateSummariesForRange(
        virtualAccountId,
        firstDateUtc,
        todayUtc,
        account.currency ?? 'USD',
        false,
      );

      return {
        success: true,
        virtualAccountId,
        from: firstDateUtc.toISOString(),
        to: todayUtc.toISOString(),
      };
    }
}
