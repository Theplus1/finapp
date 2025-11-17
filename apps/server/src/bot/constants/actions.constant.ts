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
    list: 'transaction.action.list',
    detail: 'transaction.action.detail',
    notification: 'transaction.action.notification',
    subscribeNotification: 'transaction.action.subscribeNotification',
    unsubscribeNotification: 'transaction.action.unsubscribeNotification',

    // Time filters
    listAllTime: 'transaction.action.list.allTime',
    listCustomTime: 'transaction.action.list.customTime',
  },
  card: {
    lock: 'card.action.lock',
    unlock: 'card.action.unlock',
  },
  cards: {
    first: 'cards.action.first',
    next: 'cards.action.next',
    list: 'cards.action.list',
    detail: 'cards.action.detail',
  },
  feedback: {
    start: 'feedback.action.start',
    cancel: 'feedback.action.cancel',
  },
};
