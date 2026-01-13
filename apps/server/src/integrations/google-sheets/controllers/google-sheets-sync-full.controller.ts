import { Controller, Post, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GoogleSheetsSyncFullService } from '../services/google-sheets-sync-full.service';

/**
 * Google Sheets Sync Full Controller
 */
@ApiTags('Google Sheets Sync Full')
@Controller('google-sheets/sync-full')
export class GoogleSheetsSyncFullController {
  private readonly logger = new Logger(GoogleSheetsSyncFullController.name);

  constructor(
    private readonly googleSheetsSyncFullService: GoogleSheetsSyncFullService,
  ) {}

  @Post('account')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Sync full data for a virtual account to Google Sheets',
    description: 'Sync transactions for a virtual account to Google Sheets. Uses all transactions for Payment, Deposit, and Location sheets. Uses latest 25k transactions for Transactions History, Hold, Reversed, and Refund sheets.'
  })
  @ApiQuery({ name: 'virtualAccountId', required: true, description: 'Virtual Account ID' })
  @ApiResponse({ status: 202, description: 'Full data sync started' })
  async syncFullDataForAccount(
    @Query('virtualAccountId') virtualAccountId: string,
  ) {
    if (!virtualAccountId) {
      return { error: 'virtualAccountId is required' };
    }

    this.googleSheetsSyncFullService.syncFullDataVirtualAccountToSheets(virtualAccountId).catch((error) => {
      this.logger.error(`Full data sync failed for ${virtualAccountId}:`, error);
    });

    return { 
      message: `Full data sync started for virtual account ${virtualAccountId}` 
    };
  }

  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Sync full data for all virtual accounts to Google Sheets',
    description: 'Sync transactions for all virtual accounts that have Google Sheet reports. Uses all transactions for Payment, Deposit, and Location sheets. Uses latest 25k transactions for Transactions History, Hold, Reversed, and Refund sheets.'
  })
  @ApiResponse({ status: 202, description: 'Full data sync started for all accounts' })
  async syncFullDataForAll() {
    this.googleSheetsSyncFullService.syncFullDataAllVirtualAccounts().catch((error) => {
      this.logger.error('Full data sync failed for all accounts:', error);
    });

    return { 
      message: 'Full data sync started for all virtual accounts' 
    };
  }
}

