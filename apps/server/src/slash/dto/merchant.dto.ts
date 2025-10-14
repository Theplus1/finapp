export interface MerchantDTO {
  categoryCode: string;
  description: string;
  location: {
    city: string;
    country: string;
    state: string;
    zip: string;
  };
  name: string;
}
