import { OmitType } from '@nestjs/swagger';
import { TransactionQueryDto } from './transaction-query.dto';

/** Query for POST export: same filters as list, without pagination. */
export class AdminTransactionExportQueryDto extends OmitType(TransactionQueryDto, [
  'page',
  'limit',
] as const) {}
