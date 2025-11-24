export const SessionSteps = {
  AWAITING_ACCOUNT_NUMBER: 'awaiting_account_number',
  AWAITING_FEEDBACK: 'awaiting_feedback',
  AWAITING_RATING: 'awaiting_rating',
  AWAITING_TRANSACTION_ID: 'awaiting_transaction_id',
  AWAITING_CARD_ID: 'awaiting_card_id',
  AWAITING_LOCK_CARD_ID: 'awaiting_lock_card_id',
  AWAITING_UNLOCK_CARD_ID: 'awaiting_unlock_card_id',
  AWAITING_EXPORT_DATE: 'awaiting_export_date',
} as const;

export type SessionStep = (typeof SessionSteps)[keyof typeof SessionSteps];
