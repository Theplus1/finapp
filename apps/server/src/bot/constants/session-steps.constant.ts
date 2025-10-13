export const SessionSteps = {
  AWAITING_ACCOUNT_NUMBER: 'awaiting_account_number',
  AWAITING_FEEDBACK: 'awaiting_feedback',
  AWAITING_RATING: 'awaiting_rating',
} as const;

export type SessionStep = typeof SessionSteps[keyof typeof SessionSteps];
