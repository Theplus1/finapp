import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GoogleSheetReportAllService, CreateGoogleSheetReportAllDto } from '../services/google-sheet-report-all.service';
import { AccountsService } from '../../../domain/accounts/accounts.service';

@ApiTags('Google Sheets Report All')
@Controller('google-sheets/reports-all')
export class GoogleSheetReportAllController {
  private readonly logger = new Logger(GoogleSheetReportAllController.name);

  constructor(
    private readonly googleSheetReportAllService: GoogleSheetReportAllService,
    private readonly accountsService: AccountsService,
  ) {}

  @Get('virtual-accounts')
  @ApiOperation({ summary: 'Get all virtual account IDs' })
  @ApiResponse({ status: 200, description: 'List of virtual account IDs' })
  async getAllVirtualAccountIds() {
    try {
      const accounts = await this.accountsService.findAll();
      const virtualAccountIds = accounts.map((account) => ({
        virtualAccountId: account.slashId,
        name: account.name,
        accountId: account.accountId,
      }));

      return {
        success: true,
        data: virtualAccountIds,
        total: virtualAccountIds.length,
      };
    } catch (error: any) {
      this.logger.error('Error getting virtual account IDs:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create or update Google Sheet report for full data sync',
    description: 'Creates or updates a report mapping a virtual account to a Google Sheet for full data sync (not divided by month).'
  })
  @ApiBody({ 
    type: CreateGoogleSheetReportAllDto,
    description: 'Report object to create/update'
  })
  @ApiResponse({ status: 201, description: 'Report created/updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrUpdateReport(@Body() dto: CreateGoogleSheetReportAllDto) {
    try {
      // Validate required fields
      if (!dto.sheetId || !dto.virtualAccountId) {
        return {
          success: false,
          error: 'Missing required fields: sheetId, virtualAccountId',
        };
      }

      this.logger.log(`Creating/updating full data report for VA ${dto.virtualAccountId}`);

      const report = await this.googleSheetReportAllService.createOrUpdate(dto);

      return {
        success: true,
        message: 'Report created/updated successfully',
        data: {
          id: report._id,
          sheetId: report.sheetId,
          sheetName: report.sheetName,
          virtualAccountId: report.virtualAccountId,
          lastSyncedAt: report.lastSyncedAt,
          lastSyncStatus: report.lastSyncStatus,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
      };
    } catch (error: any) {
      this.logger.error('Error creating/updating report:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Bulk create or update Google Sheet reports for full data sync',
    description: 'Accepts an array of reports to create or update. Returns results for each item.'
  })
  @ApiBody({ 
    type: [CreateGoogleSheetReportAllDto],
    description: 'Array of report objects to create/update'
  })
  @ApiResponse({ status: 201, description: 'Reports processed (may include partial failures)' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrUpdateReportsBulk(@Body() dtos: CreateGoogleSheetReportAllDto[]) {
    try {
      // Validate input is an array
      if (!Array.isArray(dtos)) {
        return {
          success: false,
          error: 'Request body must be an array of report objects',
        };
      }

      if (dtos.length === 0) {
        return {
          success: false,
          error: 'Array cannot be empty',
        };
      }

      this.logger.log(`Bulk creating/updating ${dtos.length} full data reports`);

      // Process all reports in parallel
      const results = await Promise.allSettled(
        dtos.map(async (dto, index) => {
          // Validate required fields
          if (!dto.sheetId || !dto.virtualAccountId) {
            throw new Error('Missing required fields: sheetId, virtualAccountId');
          }

          const report = await this.googleSheetReportAllService.createOrUpdate(dto);

          return {
            index,
            success: true,
            data: {
              id: report._id,
              sheetId: report.sheetId,
              sheetName: report.sheetName,
              virtualAccountId: report.virtualAccountId,
            },
          };
        }),
      );

      // Process results
      const successful: any[] = [];
      const failed: any[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            index,
            error: result.reason?.message || 'Unknown error',
            input: dtos[index],
          });
        }
      });

      return {
        success: true,
        message: `Processed ${dtos.length} reports: ${successful.length} successful, ${failed.length} failed`,
        data: {
          successful,
          failed,
          summary: {
            total: dtos.length,
            successful: successful.length,
            failed: failed.length,
          },
        },
      };
    } catch (error: any) {
      this.logger.error('Error bulk creating/updating reports:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update Google Sheet report for full data sync (alias for POST)' })
  @ApiBody({ type: CreateGoogleSheetReportAllDto })
  @ApiResponse({ status: 200, description: 'Report updated successfully' })
  async updateReport(@Body() dto: CreateGoogleSheetReportAllDto) {
    return this.createOrUpdateReport(dto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get Google Sheet reports for full data sync',
    description: 'Filter by virtualAccountId. If not provided, returns all reports.'
  })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getAllReports(
    @Query('virtualAccountId') virtualAccountId?: string,
  ) {
    try {
      let reports;
      
      if (virtualAccountId) {
        // Filter by virtualAccountId
        const report = await this.googleSheetReportAllService.findByVirtualAccountId(virtualAccountId);
        reports = report ? [report] : [];
      } else {
        // Get all reports
        reports = await this.googleSheetReportAllService.findAll();
      }

      return {
        success: true,
        data: reports.map((report) => {
          const reportObj = report.toObject();
          return {
            id: reportObj._id,
            sheetId: reportObj.sheetId,
            sheetName: reportObj.sheetName,
            virtualAccountId: reportObj.virtualAccountId,
            lastSyncedAt: reportObj.lastSyncedAt,
            lastSyncStatus: reportObj.lastSyncStatus,
            lastSyncError: reportObj.lastSyncError,
            createdAt: reportObj.createdAt,
            updatedAt: reportObj.updatedAt,
          };
        }),
        total: reports.length,
      };
    } catch (error: any) {
      this.logger.error('Error getting reports:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  @Get('check')
  @ApiOperation({ 
    summary: 'Check if a virtual account has a report in ggsheetReportAlls collection',
    description: 'Returns true if report exists, false otherwise. Returns report data if exists.'
  })
  @ApiResponse({ status: 200, description: 'Check result' })
  async checkReportExists(
    @Query('virtualAccountId') virtualAccountId: string,
  ) {
    try {
      if (!virtualAccountId) {
        return {
          success: false,
          error: 'virtualAccountId is required',
        };
      }

      const report = await this.googleSheetReportAllService.findByVirtualAccountId(virtualAccountId);

      if (report) {
        const reportObj = report.toObject();
        return {
          success: true,
          exists: true,
          data: {
            id: reportObj._id,
            sheetId: reportObj.sheetId,
            sheetName: reportObj.sheetName,
            virtualAccountId: reportObj.virtualAccountId,
            lastSyncedAt: reportObj.lastSyncedAt,
            lastSyncStatus: reportObj.lastSyncStatus,
            lastSyncError: reportObj.lastSyncError,
            createdAt: reportObj.createdAt,
            updatedAt: reportObj.updatedAt,
          },
        };
      }

      return {
        success: true,
        exists: false,
        data: null,
      };
    } catch (error: any) {
      this.logger.error('Error checking report:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}

