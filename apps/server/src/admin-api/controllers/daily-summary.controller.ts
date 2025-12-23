import { Controller, Param, Post, Logger, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DailyPaymentSummariesService } from 'src/domain/daily-payment-summaries/daily-payment-summaries.service';
import { RecalculateDailySummaryDto } from '../dto/recaculate-summary.dto';
import { SuperAdminAuthGuard } from '../guards/super-admin-auth.guard';

@ApiTags('Internal API - Daily Summary')
@ApiBearerAuth()
@Controller('internal-api/daily-summary')
export class DailySummaryController {
    private readonly logger = new Logger(DailySummaryController.name);

    constructor(
        private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
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
}
