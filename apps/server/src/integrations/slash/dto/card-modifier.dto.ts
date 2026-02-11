export type CardModifierName = 'only_allow_recurring_payments';

export interface CardModifierDto {
  name: CardModifierName;
  value: boolean;
}

export interface CardModifiersResponseDto {
  modifiers: CardModifierDto[];
}

