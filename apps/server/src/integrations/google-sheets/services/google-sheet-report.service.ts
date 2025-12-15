import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GoogleSheetReportRepository } from '../../../database/repositories/google-sheet-report.repository';
import { GoogleSheetReportDocument } from '../../../database/schemas/google-sheet-report.schema';

export interface CreateGoogleSheetReportDto {
  sheetId: string;
  sheetName: string;
  virtualAccountId: string;
  month: number; // 1-12
  year: number; // e.g., 2025
}

@Injectable()
export class GoogleSheetReportService {
  private readonly logger = new Logger(GoogleSheetReportService.name);

  constructor(
    private readonly googleSheetReportRepository: GoogleSheetReportRepository,
  ) {}

  async createOrUpdate(dto: CreateGoogleSheetReportDto): Promise<GoogleSheetReportDocument> {
    this.logger.log(
      `Creating/updating report for VA ${dto.virtualAccountId}, ${dto.year}-${dto.month}`,
    );

    // Validate month and year
    if (dto.month < 1 || dto.month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    if (dto.year < 2000 || dto.year > 3000) {
      throw new Error('Year must be a valid year');
    }

    return this.googleSheetReportRepository.upsert(
      dto.virtualAccountId,
      dto.month,
      dto.year,
      {
        sheetId: dto.sheetId,
        sheetName: dto.sheetName,
        virtualAccountId: dto.virtualAccountId,
        month: dto.month,
        year: dto.year,
      },
    );
  }

  async findByVirtualAccountIdAndMonth(
    virtualAccountId: string,
    month: number,
    year: number,
  ): Promise<GoogleSheetReportDocument | null> {
    return this.googleSheetReportRepository.findByVirtualAccountIdAndMonth(
      virtualAccountId,
      month,
      year,
    );
  }

  async findByVirtualAccountId(virtualAccountId: string): Promise<GoogleSheetReportDocument[]> {
    return this.googleSheetReportRepository.findByVirtualAccountId(virtualAccountId);
  }

  async findAll(): Promise<GoogleSheetReportDocument[]> {
    return this.googleSheetReportRepository.findAll();
  }

  async delete(virtualAccountId: string, month: number, year: number): Promise<boolean> {
    return this.googleSheetReportRepository.delete(virtualAccountId, month, year);
  }

  /**
   * Find report by pattern: [VAId]_[YYYY-MM]
   * Converts month format from number (1-12) to string format (YYYY-MM)
   */
  async findByPattern(virtualAccountId: string, yearMonth: string): Promise<GoogleSheetReportDocument | null> {
    // Parse YYYY-MM format (e.g., "2025-12")
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      this.logger.warn(`Invalid year-month format: ${yearMonth}`);
      return null;
    }

    return this.findByVirtualAccountIdAndMonth(virtualAccountId, month, year);
  }
}

