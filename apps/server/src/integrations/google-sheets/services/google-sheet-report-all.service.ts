import { Injectable, Logger } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoogleSheetReportAllRepository } from '../../../database/repositories/google-sheet-report-all.repository';
import { GoogleSheetReportAllDocument } from '../../../database/schemas/google-sheet-report-all.schema';

export class CreateGoogleSheetReportAllDto {
  @ApiProperty({ description: 'Google Spreadsheet ID', example: '1abc123...' })
  @IsString()
  @IsNotEmpty()
  sheetId: string;

  @ApiProperty({ description: 'Virtual Account ID', example: 'VA123' })
  @IsString()
  @IsNotEmpty()
  virtualAccountId: string;
}

@Injectable()
export class GoogleSheetReportAllService {
  private readonly logger = new Logger(GoogleSheetReportAllService.name);

  constructor(
    private readonly googleSheetReportAllRepository: GoogleSheetReportAllRepository,
  ) {}

  async createOrUpdate(dto: CreateGoogleSheetReportAllDto): Promise<GoogleSheetReportAllDocument> {
    this.logger.log(
      `Creating/updating full data report for VA ${dto.virtualAccountId}`,
    );

    return this.googleSheetReportAllRepository.upsert(
      dto.virtualAccountId,
      {
        sheetId: dto.sheetId,
        virtualAccountId: dto.virtualAccountId,
      },
    );
  }

  async findByVirtualAccountId(virtualAccountId: string): Promise<GoogleSheetReportAllDocument | null> {
    return this.googleSheetReportAllRepository.findByVirtualAccountId(virtualAccountId);
  }

  async findAll(): Promise<GoogleSheetReportAllDocument[]> {
    return this.googleSheetReportAllRepository.findAll();
  }

  async delete(virtualAccountId: string): Promise<boolean> {
    return this.googleSheetReportAllRepository.delete(virtualAccountId);
  }
}

