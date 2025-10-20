import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ExportType } from 'src/database/schemas/export-job.schema';

export class CreateExportDto {
  @IsEnum(ExportType)
  type: ExportType;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}
