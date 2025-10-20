import { ExportStatus, ExportType } from 'src/database/schemas/export-job.schema';

export class ExportJobResponseDto {
  id: string;
  userId: number;
  type: ExportType;
  status: ExportStatus;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  errorMessage?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
