import { formatCurrency } from "src/shared/utils/formatCurrency.util";
import type { TransactionDataDTO } from "src/slash";
import type { UserDocument } from "src/users/users.schema";
import type { AccessStatus } from "src/users/users.schema";

export const Messages = {
  // Welcome & Help
  welcome: (name: string) =>
    `👋 Welcome ${name}!\n\n` +
    `Use /help to see available commands.`,

  // Account Setup
  requestAccountNumber: (name: string) =>
    `👋 Welcome ${name}!\n\n` +
    `To get started, please send me your virtual account ID.\n\n` +
    `(Send /cancel to cancel)`,
  accountNumberLinked: (accountName: string) =>
    `✅ *Virtual Account Linked Successfully!*\n\n` +
    `Your virtual account *${accountName}* has been linked to your Telegram account.\n\n` +
    `You can now use all bot features.`,
  accountNumberAlreadyLinked: (accountId: string) =>
    `ℹ️ Your account is already linked to virtual account ID: *${accountId}*`,
  accountNumberInvalid: 
    `❌ Invalid virtual account ID format.\n\n` +
    `Please send a valid virtual account ID or use /cancel to cancel.`,

  help:
    `📚 *Available Commands:*\n\n` +
    `/start - Start the bot\n` +
    `/help - Show this help message\n` +
    `/menu - Show main menu\n` +
    `/subscribe - Subscribe to notifications\n` +
    `/unsubscribe - Unsubscribe from notifications\n` +
    `/status - Check your subscription status\n` +
    `/feedback - Send feedback (multi-step conversation)`,

  // Menu
  mainMenu: '📋 *Main Menu*\n\nChoose an option:',

  // Subscription
  subscribed:
    '✅ You have been subscribed to daily notifications!\n\n' +
    'You will receive updates every day at 9:00 AM.',
  unsubscribed: '❌ You have been unsubscribed from notifications.',
  subscribedStatus: '✅ Subscribed',
  unsubscribedStatus: '❌ Not subscribed',

  // Notifications
  notificationSettings: (isSubscribed: boolean) =>
    `🔔 *Notification Settings*\n\n` +
    `Status: ${isSubscribed ? '✅ Subscribed' : '❌ Not subscribed'}\n\n` +
    `${isSubscribed ? 'You will receive daily notifications at 9:00 AM.' : 'Subscribe to receive daily updates!'}`,

  subscribeSuccess:
    '✅ *Subscribed!*\n\n' + 'You will now receive daily notifications at 9:00 AM.',
  unsubscribeSuccess:
    '❌ *Unsubscribed*\n\n' + 'You will no longer receive daily notifications.',

  // About
  about:
    `ℹ️ *About This Bot*\n\n` +
    `\n`,

  // Feedback
  feedbackStart:
    '💬 *Feedback Form*\n\n' +
    'Please share your feedback with us. What do you think about this bot?\n\n' +
    '(Send /cancel to cancel)',
  feedbackRating: '⭐ *Rate Your Experience*\n\n' + 'Please rate your experience from 1 to 5:',
  feedbackInvalidRating: 'Please enter a number between 1 and 5.',
  feedbackThankYou: (feedback: string, rating: number) =>
    `✅ *Thank you for your feedback!*\n\n` +
    `Your feedback: "${feedback}"\n` +
    `Rating: ${'⭐'.repeat(rating)}\n\n` +
    `We appreciate your input!`,

  // Status
  userStatus: (telegramId: number, username: string | undefined, isSubscribed: boolean, createdAt: Date) =>
    `📊 *Your Status:*\n\n` +
    `User ID: ${telegramId}\n` +
    `Username: @${username || 'N/A'}\n` +
    `Notifications: ${isSubscribed ? '✅ Subscribed' : '❌ Not subscribed'}\n` +
    `Member since: ${createdAt.toLocaleDateString()}`,

  userNotFound: 'User not found. Please use /start first.',
  
  // Error messages
  mustStartBot: '⚠️ Please use /start command first to set up your account.',
  mustLinkAccount: '⚠️ Please link your virtual account first. Use /start to set up your account.',

  // Cards
  accountNotLinked: '⚠️ Please link your virtual account first. Use /start to set up your account.',
  noCardsFound: '📭 No cards found for your account.',
  cardNotFound: '❌ Card not found or you do not have access to this card.',
  errorFetchingCards: '❌ Error fetching cards. Please try again later.',

  // Transactions
  transactionsMenu: '📋 *Transactions Menu*\n\nChoose an option:',
  transactionNotificationMenu: (isSubscribed: boolean) =>
    `🔔 *Transaction Notifications*\n\n` +
    `Status: ${isSubscribed ? '✅ Subscribed' : '❌ Unsubscribed'}\n\n` +
    `${isSubscribed ? 'Notifications when a transaction is changed.' : 'No notifications when a transaction is changed.'}`,
  subscribeTransactionsSuccess:
    '✅ *Subscribed!*\n\n' +
    'You will now receive notifications when a transaction is changed.',
  unsubscribeTransactionsSuccess:
    '❌ *Unsubscribed*\n\n' +
    'You will no longer receive notifications when a transaction is changed.',

  noTransactionsFound: '📭 No transactions found for your account.',
  transactionInfoPrompt: 'Please send the transaction ID you want to look up.\n\n(Send /cancel to cancel)',
  errorFetchingTransactions: '❌ Error fetching transactions. Please try again later.',

  transactionCreated: (transaction: TransactionDataDTO) =>
    `✅ *Transaction Created!*\n` +
    `Amount: ${formatCurrency(transaction.amountCents || 0, transaction.originalCurrency?.code)}\n` +
    `Status: ${transaction.status || 'N/A'}\n` +
    `Description: ${transaction.description || 'N/A'}\n` +
    `Country: ${transaction.merchantData.location.country}\n` +
    `Created: ${new Date(transaction.date).toLocaleString()}\n` +
    `Transaction ID: ${transaction.id || 'N/A'}`,
  transactionUpdated: (transaction: TransactionDataDTO) =>
    `✅ *Transaction Updated!*\n` +
    `Amount: ${formatCurrency(transaction.amountCents || 0, transaction.originalCurrency?.code)}\n` +
    `Status: ${transaction.status || 'N/A'}\n` +
    `Description: ${transaction.description || 'N/A'}\n` +
    `Country: ${transaction.merchantData.location.country}\n` +
    `Created: ${new Date(transaction.date).toLocaleString()}\n` +
    `Transaction ID: ${transaction.id || 'N/A'}`,

  replyCancelled: '❌ Reply cancelled.',

  // ==================== Access Control Messages ====================
  
  // User-facing messages
  accessPending:
    '⏳ *Access Pending*\n\n' +
    'Your access request is pending approval from an administrator.\n\n' +
    'You will be notified once your request has been reviewed.',

  accessDenied: (reason?: string) =>
    `🚫 *Access Denied*\n\n` +
    `Your access request has been denied.\n\n` +
    `${reason ? `Reason: ${reason}\n\n` : ''}` +
    `Please contact an administrator for more information.`,

  accessRevoked: (reason?: string) =>
    `🚫 *Access Revoked*\n\n` +
    `Your access has been revoked.\n\n` +
    `${reason ? `Reason: ${reason}\n\n` : ''}` +
    `Please contact an administrator for more information.`,

  yourAccessApproved:
    '✅ *Access Approved!*\n\n' +
    'Your access request has been approved by an administrator.\n\n' +
    'You can now use all bot features!',

  yourAccessDenied: (reason: string) =>
    `🚫 *Access Denied*\n\n` +
    `Your access request has been denied.\n\n` +
    `Reason: ${reason}\n\n` +
    `Please contact an administrator if you believe this is a mistake.`,

  yourAccessRevoked: (reason: string) =>
    `🚫 *Access Revoked*\n\n` +
    `Your access has been revoked.\n\n` +
    `Reason: ${reason}\n\n` +
    `Please contact an administrator for more information.`,

  accessRequestSubmitted: (name: string) =>
    `✅ *Registration Successful!*\n\n` +
    `Welcome ${name}!\n\n` +
    `Your access request has been submitted to the administrators.\n\n` +
    `You will be notified once your request has been reviewed.`,

  // Admin-facing messages
  notAuthorized: '🚫 You are not authorized to perform this action.',

  adminPanel: (pendingCount: number, approvedCount: number) =>
    `🔐 *Admin Panel*\n\n` +
    `📊 *Statistics:*\n` +
    `• Pending Requests: ${pendingCount}\n` +
    `• Approved Users: ${approvedCount}\n\n` +
    `Use the buttons below to manage users.`,

  noPendingRequests:
    '✅ *No Pending Requests*\n\n' +
    'There are no pending access requests at the moment.',

  pendingUserInfo: (user: UserDocument) =>
    `👤 *New Access Request*\n\n` +
    `*User Information:*\n` +
    `• Telegram ID: \`${user.telegramId}\`\n` +
    `• Username: ${user.username ? `@${user.username}` : 'N/A'}\n` +
    `• Name: ${user.firstName || ''} ${user.lastName || ''}\n` +
    `• Virtual Account: ${user.virtualAccountId || 'Not linked'}\n` +
    `• Requested: ${user.accessRequestedAt ? new Date(user.accessRequestedAt).toLocaleString() : 'N/A'}\n\n` +
    `Choose an action:`,

  userAccessApproved: (user: UserDocument) =>
    `✅ *Access Approved*\n\n` +
    `User @${user.username || user.telegramId} has been granted access.`,

  userAccessDenied: (user: UserDocument, reason: string) =>
    `🚫 *Access Denied*\n\n` +
    `User @${user.username || user.telegramId} access has been denied.\n` +
    `Reason: ${reason}`,

  userAccessRevoked: (user: UserDocument, reason: string) =>
    `🚫 *Access Revoked*\n\n` +
    `User @${user.username || user.telegramId} access has been revoked.\n` +
    `Reason: ${reason}`,

  newAccessRequest: (
    telegramId: number,
    username: string | undefined,
    firstName: string | undefined,
    lastName: string | undefined,
  ) =>
    `🔔 *New Access Request*\n\n` +
    `*User Information:*\n` +
    `• Telegram ID: \`${telegramId}\`\n` +
    `• Username: ${username ? `@${username}` : 'N/A'}\n` +
    `• Name: ${firstName || ''} ${lastName || ''}\n\n` +
    `Use /admin to review and approve/deny this request.`,

  allUsersStats: (
    totalUsers: number,
    statusCounts: Record<AccessStatus, number>,
  ) =>
    `📊 *All Users Statistics*\n\n` +
    `*Total Users:* ${totalUsers}\n\n` +
    `*By Status:*\n` +
    `• ⏳ Pending: ${statusCounts.pending}\n` +
    `• ✅ Approved: ${statusCounts.approved}\n` +
    `• 🚫 Denied: ${statusCounts.denied}\n` +
    `• ⛔ Revoked: ${statusCounts.revoked}`,
};
