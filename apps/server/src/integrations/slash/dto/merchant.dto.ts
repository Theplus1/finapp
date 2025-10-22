import { Expose, Type } from 'class-transformer';

export class MerchantLocationDTO {
  @Expose()
  city: string;

  @Expose()
  country: string;

  @Expose()
  state: string;

  @Expose()
  zip: string;
}

export class MerchantDTO {
  @Expose()
  name: string;

  @Expose()
  categoryCode: string;

  @Expose()
  description: string;
  
  @Expose()
  @Type(() => MerchantLocationDTO)
  location: MerchantLocationDTO;
}
