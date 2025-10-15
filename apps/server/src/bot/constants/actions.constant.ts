export const Actions = {
  menu: {
    main: 'menu',
    transaction: 'menu.action.transaction',
    cards: 'menu.action.cards',
    about: 'menu.action.about',
    feedback: 'menu.action.feedback',
  },
  // Transactions actions
  transaction: {
    detail: 'transaction.action.detail',
    notification: 'transaction.action.notification',
    subscribeNotification: 'transaction.action.subscribeNotification',
    unsubscribeNotification: 'transaction.action.unsubscribeNotification',
  },
  card: {
    lock: 'card.action.lock',
    unlock: 'card.action.unlock',
  },
  cards: {
    first: 'cards.action.first',
    next: 'cards.action.next',
  },
  feedback: {
    start: 'feedback.action.start',
    cancel: 'feedback.action.cancel',
  },
};
