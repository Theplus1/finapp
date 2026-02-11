export const SessionSteps = {
  AWAITING_ACCOUNT_NUMBER: 'awaiting_account_number',
  AWAITING_FEEDBACK: 'awaiting_feedback',
  AWAITING_RATING: 'awaiting_rating',
  AWAITING_TRANSACTION_ID: 'awaiting_transaction_id',
  AWAITING_CARD_ID: 'awaiting_card_id',
  AWAITING_LOCK_CARD_ID: 'awaiting_lock_card_id',
  AWAITING_UNLOCK_CARD_ID: 'awaiting_unlock_card_id',
  AWAITING_EXPORT_DATE: 'awaiting_export_date',
  AWAITING_TOPICALERT_REPLY: 'awaiting_topicalert_reply',
  AWAITING_SET_LIMIT_CARD_ID: 'awaiting_set_limit_card_id',
  AWAITING_SET_LIMIT_PRESET: 'awaiting_set_limit_preset',
  AWAITING_SET_LIMIT_AMOUNT: 'awaiting_set_limit_amount',
  AWAITING_UNSET_LIMIT_CARD_ID: 'awaiting_unset_limit_card_id',
  AWAITING_SET_RECURRING_ONLY_CARD_ID: 'awaiting_set_recurring_only_card_id',
  AWAITING_UNSET_RECURRING_ONLY_CARD_ID: 'awaiting_unset_recurring_only_card_id',
} as const;

export type SessionStep = (typeof SessionSteps)[keyof typeof SessionSteps];
