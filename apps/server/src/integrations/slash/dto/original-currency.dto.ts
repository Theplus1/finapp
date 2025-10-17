import { Expose } from "class-transformer";

export class OriginalCurrencyDto {
    @Expose()
    amountCents: number;
    @Expose()
    code: string;
    @Expose()
    conversionRate: number;
}
