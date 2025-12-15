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
import { GoogleSheetReportService, CreateGoogleSheetReportDto } from '../services/google-sheet-report.service';
import { AccountsService } from '../../../domain/accounts/accounts.service';

@ApiTags('Google Sheets Report')
@Controller('google-sheets')
export class GoogleSheetReportController {
  private readonly logger = new Logger(GoogleSheetReportController.name);

  constructor(
    private readonly googleSheetReportService: GoogleSheetReportService,
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

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Bulk create or update Google Sheet reports',
    description: 'Accepts an array of reports to create or update. Returns results for each item.'
  })
  @ApiBody({ 
    type: [Object],
    description: 'Array of report objects to create/update'
  })
  @ApiResponse({ status: 201, description: 'Reports processed (may include partial failures)' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrUpdateReport(@Body() dtos: CreateGoogleSheetReportDto[]) {
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

      this.logger.log(`Bulk creating/updating ${dtos.length} reports`);

      // Process all reports in parallel
      const results = await Promise.allSettled(
        dtos.map(async (dto, index) => {
          // Validate required fields
          if (!dto.sheetId || !dto.sheetName || !dto.virtualAccountId || !dto.month || !dto.year) {
            throw new Error('Missing required fields: sheetId, sheetName, virtualAccountId, month, year');
          }

          const report = await this.googleSheetReportService.createOrUpdate(dto);

          return {
            index,
            success: true,
            data: {
              id: report._id,
              sheetId: report.sheetId,
              sheetName: report.sheetName,
              virtualAccountId: report.virtualAccountId,
              month: report.month,
              year: report.year,
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

  @Put('reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update Google Sheet reports (alias for POST)' })
  @ApiBody({ type: [Object] })
  @ApiResponse({ status: 200, description: 'Reports updated successfully' })
  async updateReport(@Body() dtos: CreateGoogleSheetReportDto[]) {
    return this.createOrUpdateReport(dtos);
  }

  @Get('reports')
  @ApiOperation({ 
    summary: 'Get all Google Sheet reports',
    description: 'Filter by virtualAccountId, month, and/or year. All filters are optional and can be combined.'
  })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getAllReports(
    @Query('virtualAccountId') virtualAccountId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    try {
      let reports;
      
      // Parse month and year if provided
      const monthNum = month ? parseInt(month, 10) : undefined;
      const yearNum = year ? parseInt(year, 10) : undefined;
      
      // Validate month if provided
      if (monthNum !== undefined && (isNaN(monthNum) || monthNum < 1 || monthNum > 12)) {
        return {
          success: false,
          error: 'Month must be a number between 1 and 12',
        };
      }
      
      // Validate year if provided
      if (yearNum !== undefined && (isNaN(yearNum) || yearNum < 2000 || yearNum > 3000)) {
        return {
          success: false,
          error: 'Year must be a valid year (2000-3000)',
        };
      }
      
      // Filter logic
      if (virtualAccountId && monthNum !== undefined && yearNum !== undefined) {
        // Filter by virtualAccountId, month, and year (most specific)
        const report = await this.googleSheetReportService.findByVirtualAccountIdAndMonth(
          virtualAccountId,
          monthNum,
          yearNum,
        );
        reports = report ? [report] : [];
      } else if (virtualAccountId) {
        // Filter by virtualAccountId only, then apply month/year filter if provided
        reports = await this.googleSheetReportService.findByVirtualAccountId(virtualAccountId);
        
        // Apply month/year filter if provided
        if (monthNum !== undefined || yearNum !== undefined) {
          reports = reports.filter((report) => {
            const reportObj = report.toObject();
            if (monthNum !== undefined && reportObj.month !== monthNum) {
              return false;
            }
            if (yearNum !== undefined && reportObj.year !== yearNum) {
              return false;
            }
            return true;
          });
        }
      } else {
        // Get all reports, then apply month/year filter if provided
        reports = await this.googleSheetReportService.findAll();
        
        // Apply month/year filter if provided
        if (monthNum !== undefined || yearNum !== undefined) {
          reports = reports.filter((report) => {
            const reportObj = report.toObject();
            if (monthNum !== undefined && reportObj.month !== monthNum) {
              return false;
            }
            if (yearNum !== undefined && reportObj.year !== yearNum) {
              return false;
            }
            return true;
          });
        }
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
            month: reportObj.month,
            year: reportObj.year,
            lastSyncedAt: reportObj.lastSyncedAt,
            lastSyncStatus: reportObj.lastSyncStatus,
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
}

