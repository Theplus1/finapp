
export const EXPORT_DATA_NAMES = {
  TRANSACTIONS: "transactions",
  CARDS: "cards",
  CARD_SPEND: "card-spend",
} as const;

export const EXPORT_URL = {
  TRANSACTIONS: "/transaction/export",
  CARDS: "/card/export",
  CARD_SPEND: "/virtual-account/card-spend/export",
  
} as const;