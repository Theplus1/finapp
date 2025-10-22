export interface FeeInfoDto {
  relatedTransaction: RelatedTransactionDto;
}

export interface RelatedTransactionDto {
  id: string;
  amount: number;
}