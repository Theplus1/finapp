import { Markup } from 'telegraf';
import { Actions } from './actions.constant';

export const Keyboards = {
  mainMenu: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('💳 Cards', Actions.menu.cards)],
      [Markup.button.callback('🧾 Transactions', Actions.menu.transaction)],
      // [Markup.button.callback('ℹ️ About', Actions.menu.about)],
      // [Markup.button.callback('💬 Feedback', Actions.menu.feedback)],
    ]),
  backToMenu: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Menu', Actions.menu.main)],
    ]),

  // Transactions keyboards
  backToTransaction: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('« Back', Actions.menu.transaction)],
    ]),

  transactionMenu: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('Transactions History', Actions.transaction.list)],
      [
        Markup.button.callback(
          'Transaction Detail',
          Actions.transaction.detail,
        ),
      ],
      [
        Markup.button.callback(
          'Notifications',
          Actions.transaction.notification,
        ),
      ],
      [Markup.button.callback('« Back to Menu', Actions.menu.main)],
    ]),
  transactionTimeFilterMenu: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('All Time', Actions.transaction.listAllTime)],
      [Markup.button.callback('Custom Time', Actions.transaction.listCustomTime)],
      [Markup.button.callback('« Back', Actions.menu.transaction)],
    ]),
  transactionNotificationMenu: (isSubscribed: boolean) =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          isSubscribed ? '❌ Unsubscribe' : '✅ Subscribe',
          isSubscribed
            ? Actions.transaction.unsubscribeNotification
            : Actions.transaction.subscribeNotification,
        ),
      ],
      [Markup.button.callback('« Back', Actions.menu.transaction)],
    ]),
  backToTransactions: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('« Back', Actions.menu.transaction)],
    ]),

  transactionsMenu: (isSubscribed: boolean) =>
    Markup.inlineKeyboard([
      // [Markup.button.callback('List Transactions', Actions.transaction.list)],
      [Markup.button.callback('Request Info', Actions.transaction.detail)],
      [
        Markup.button.callback(
          isSubscribed ? '❌ Unsubscribe' : '✅ Subscribe',
          isSubscribed
            ? Actions.transaction.unsubscribeNotification
            : Actions.transaction.subscribeNotification,
        ),
      ],
      [Markup.button.callback('« Back to Menu', Actions.menu.main)],
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
      [Markup.button.callback('« Back to Menu', Actions.menu.main)],
    ]),

  backToNotifications: () =>
    Markup.inlineKeyboard([[Markup.button.callback('« Back', Actions.menu.main)]],),

  // Feedback keyboards
  feedbackRating: () => Markup.keyboard([['1', '2', '3', '4', '5'], ['/cancel']]).resize(),

  removeKeyboard: () => Markup.removeKeyboard(),

  // Cards keyboards
  cardsMenu: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('Card Detail', Actions.cards.detail)],
      [Markup.button.callback('Lock Card', Actions.cards.lock), Markup.button.callback('Unlock Card', Actions.cards.unlock)],
      [Markup.button.callback('« Back to Menu', Actions.menu.main)],
    ]),
  cardsList: (cards: any[], currentCursor?: string, nextCursor?: string) => {
    const buttons = cards.map((card) =>
      [Markup.button.callback(`💳 ${card.name}`, `card_${card.id}`)],
    );

    // Add pagination buttons if needed
    const paginationButtons = [];
    if (currentCursor) {
      paginationButtons.push(Markup.button.callback('⬅️ First Page', Actions.cards.first));
    }
    if (nextCursor) {
      // Cursor is stored in session, use simple callback identifier
      paginationButtons.push(Markup.button.callback('Next Page ➡️', Actions.cards.next));
    }

    if (paginationButtons.length > 0) {
      buttons.push(paginationButtons);
    }

    buttons.push([Markup.button.callback('« Back to Menu', Actions.menu.main)]);
    return Markup.inlineKeyboard(buttons);
  },

  cardDetail: (cardId: string, isActive: boolean) =>
    Markup.inlineKeyboard([
      // [Markup.button.callback(isActive ? '🔒 Lock' : '🔓 Unlock', `card_${cardId}_${isActive ? 'lock' : 'unlock'}`)],
      [Markup.button.callback('« Back', Actions.menu.cards)],
      [Markup.button.callback('« Back to Menu', Actions.menu.main)],
    ]),

  // ==================== Admin Keyboards ====================
  
  adminPanel: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Pending Requests', 'admin.pending')],
      [Markup.button.callback('👥 All Users', 'admin.users')],
      [Markup.button.callback('« Close', 'admin.close')],
    ]),

  backToAdminPanel: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Admin Panel', 'admin.panel')],
    ]),

  userAccessActions: (telegramId: number) =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Approve', `admin.approve.${telegramId}`),
        Markup.button.callback('🚫 Deny', `admin.deny.${telegramId}`),
      ],
      [Markup.button.callback('« Back', 'admin.pending')],
    ]),

  quickApprove: (telegramId: number) =>
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Quick Approve', `admin.approve.${telegramId}`)],
      [Markup.button.callback('📋 View All Requests', 'admin.pending')],
    ]),
};
