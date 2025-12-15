import { Controller, Post, Get, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleSheetsSyncService } from '../services/google-sheets-sync.service';

/**
 * Google Sheets Sync Controller
 * Manual sync endpoints for administrators
 */
@ApiTags('Google Sheets Sync')
@Controller('google-sheets/sync')
export class GoogleSheetsSyncController {
  private readonly logger = new Logger(GoogleSheetsSyncController.name);

  constructor(
    private readonly googleSheetsSyncService: GoogleSheetsSyncService,
  ) {}

  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger sync all virtual accounts to Google Sheets' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncAll() {
    // Run async without waiting
    this.googleSheetsSyncService.syncAllVirtualAccounts().catch((error) => {
      this.logger.error('Manual Google Sheets sync failed:', error);
    });

    return { message: 'Google Sheets sync started for all virtual accounts' };
  }

  @Post('account')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger sync for a specific virtual account' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncAccount(@Query('virtualAccountId') virtualAccountId: string) {
    if (!virtualAccountId) {
      return { error: 'virtualAccountId is required' };
    }

    // Run async without waiting
    this.googleSheetsSyncService.syncVirtualAccountToSheets(virtualAccountId).catch((error) => {
      this.logger.error(`Manual Google Sheets sync failed for ${virtualAccountId}:`, error);
    });

    return { message: `Google Sheets sync started for virtual account ${virtualAccountId}` };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get sync status for a virtual account' })
  @ApiResponse({ status: 200, description: 'Sync status' })
  async getSyncStatus(@Query('virtualAccountId') virtualAccountId?: string) {
    if (virtualAccountId) {
      const status = await this.googleSheetsSyncService.getSyncStatus(virtualAccountId);
      return status || { message: 'No sync record found' };
    }

    const allRecords = await this.googleSheetsSyncService.getAllSyncRecords();
    return {
      total: allRecords.length,
      records: allRecords,
    };
  }
}

