import { Markup } from 'telegraf';

export const Keyboards = {
  // Main keyboards
  welcome: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Main Menu', 'menu')],
      [Markup.button.callback('🔔 Notifications', 'notifications')],
    ]),

  mainMenu: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('💳 Cards', 'cards')],
      [Markup.button.callback('🧾 Transactions', 'transactions')],
      [Markup.button.callback('ℹ️ About', 'about')],
      [Markup.button.callback('💬 Feedback', 'start_feedback')],
    ]),

  transactionsMenu: (isSubscribed: boolean) =>
    Markup.inlineKeyboard([
      [Markup.button.callback('List Transactions', 'transaction.action.list')],
      [Markup.button.callback('Request Info', 'transaction.action.info')],
      [
        Markup.button.callback(
          isSubscribed ? '❌ Unsubscribe' : '✅ Subscribe',
          isSubscribed
            ? 'transaction.action.unsubscribe'
            : 'transaction.action.subscribe',
        ),
      ],
      [Markup.button.callback('« Back to Menu', 'menu')],
    ]),

  // Notification keyboards
  notificationSettings: (isSubscribed: boolean) =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          isSubscribed ? '❌ Unsubscribe' : '✅ Subscribe',
          isSubscribed ? 'unsubscribe' : 'subscribe',
        ),
      ],
      [Markup.button.callback('« Back to Menu', 'menu')],
    ]),

  backToNotifications: () =>
    Markup.inlineKeyboard([[Markup.button.callback('« Back', 'notifications')]]),
  backToTransactions: () =>
    Markup.inlineKeyboard([[Markup.button.callback('« Back', 'transactions')]]),

  backToMenu: () => Markup.inlineKeyboard([[Markup.button.callback('« Back to Menu', 'menu')]]),

  // Feedback keyboards
  feedbackRating: () => Markup.keyboard([['1', '2', '3', '4', '5'], ['/cancel']]).resize(),

  removeKeyboard: () => Markup.removeKeyboard(),

  // Cards keyboards
  cardsList: (cards: any[], currentCursor?: string, nextCursor?: string) => {
    const buttons = cards.map((card) =>
      [Markup.button.callback(`💳 ${card.name}`, `card_${card.id}`)],
    );
    
    // Add pagination buttons if needed
    const paginationButtons = [];
    if (currentCursor) {
      paginationButtons.push(Markup.button.callback('⬅️ First Page', 'cards_first'));
    }
    if (nextCursor) {
      // Cursor is stored in session, use simple callback identifier
      paginationButtons.push(Markup.button.callback('Next Page ➡️', 'cards_next'));
    }
    
    if (paginationButtons.length > 0) {
      buttons.push(paginationButtons);
    }
    
    buttons.push([Markup.button.callback('« Back to Menu', 'menu')]);
    return Markup.inlineKeyboard(buttons);
  },

  cardDetail: (cardId: string) =>
    Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Cards', 'cards')],
      [Markup.button.callback('« Back to Menu', 'menu')],
    ]),
};
