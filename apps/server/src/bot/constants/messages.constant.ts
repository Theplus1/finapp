import { format } from "date-fns";
import { TransactionDataDTO } from "src/integrations/slash/dto/webhook.dto";
import { CardDto, TransactionDetailedStatus } from "src/integrations/slash/types";
import { formatCurrency } from "src/shared/utils/formatCurrency.util";
import { MarkdownUtil } from "src/shared/utils/markdown.util";
import { HtmlUtil } from "src/shared/utils/html.util";
import type { UserDocument } from "src/users/users.schema";
import type { AccessStatus } from "src/users/users.schema";

function formatVirtualAccountBalanceLine(
  vaName: string,
  balanceUsd: number,
): string {
  return `${HtmlUtil.escape(vaName)}: ${Math.round(balanceUsd).toLocaleString("en-US")}$`;
}

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
    `*General:*\n` +
    `/start - Start the bot\n` +
    `/help - Show this help message\n` +
    `/menu - Show main menu\n` +
    `/status - Check your subscription status\n\n` +
    `*Notifications:*\n` +
    `/subscribe - Subscribe to notifications\n` +
    `/unsubscribe - Unsubscribe from notifications\n` +
    `/connect - Connect group/channel for notifications\n` +
    `/disconnect - Disconnect current group/channel\n` +
    `/destinations - List all connected chats\n\n` +
    `/topicalert - Set this topic as destination for balance/card alerts\n\n` +
    `*Other:*\n` +
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
  cardsMenu: '📋 *Cards Menu*\n\nChoose an option:',
  accountNotLinked: '⚠️ Please link your virtual account first. Use /start to set up your account.',
  noCardsFound: '📭 No cards found for your account.',
  cardNotFound: '❌ Card not found or you do not have access to this card.',
  errorFetchingCards: '❌ Error fetching cards. Please try again later.',
  cardDetailStart: '💬 *Card Detail Form*\n\n' +
    'Please *REPLY* to this message with the card ID you want to look up.\n\n(Send /cancel to cancel)',
  cardLockStart: '💬 *Card Lock Form*\n\n' +
    'Please *REPLY* to this message with the card ID you want to lock.\n\n(Send /cancel to cancel)',
  cardUnlockStart: '💬 *Card Unlock Form*\n\n' +
    'Please *REPLY* to this message with the card ID you want to unlock.\n\n(Send /cancel to cancel)',
  cardDailyLimitStart:
    '💬 *Card Spending Limit Form*\n\n' +
    'Please *REPLY* to this message with the card ID you want to set a *spending limit* for.\n\n' +
    '(Send /cancel to cancel)',
  cardLimitPresetPrompt: (cardName: string, last4: string) =>
    '⚙️ *Chọn loại limit*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n\n` +
    'Chọn chu kỳ reset limit:',
  cardDailyLimitAmountPrompt: (
    cardName: string,
    last4: string,
    presetLabel: string,
  ) =>
    '💬 *Nhập số tiền limit (USD)*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n` +
    `Loại: ${MarkdownUtil.escapse(presetLabel)}\n\n` +
    'Vui lòng *REPLY* với số tiền giới hạn.\n\n' +
    'Ví dụ: `10000`, `500`, `10000.50`\n\n' +
    '(Send /cancel to cancel)',
  cardDailyLimitInvalidAmount:
    '❌ Invalid amount format.\n\n' +
    'Please enter a positive number. Examples: `10000`, `500`, `10000.50`.\n\n' +
    '(Send /cancel to cancel)',
  cardLimitSuccess: (
    cardName: string,
    last4: string,
    amount: number,
    presetLabel: string,
  ) =>
    '✅ *Limit đã thiết lập*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n` +
    `Limit: $${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} — ${presetLabel}\n\n` +
    'Limit sẽ áp dụng cho giao dịch sau.',

  /** Nhãn hiển thị cho từng loại limit (Slash API: daily | weekly | monthly | yearly | collective) */
  limitPresetLabels: {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    collective: 'Collective',
  } as const,

  cardDailyLimitUnsetStart:
    '💬 *Unset Card Daily Limit Form*\n\n' +
    'Please *REPLY* to this message with the card ID you want to *remove the daily spending limit* for.\n\n' +
    '(Send /cancel to cancel)',
  cardDailyLimitUnsetSuccess: (cardName: string, last4: string) =>
    '✅ *Limit Removed Successfully!*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n\n` +
    'This card no longer has a spending limit configured.',
  cardDailyLimitUnsetNoConstraint: (cardName: string, last4: string) =>
    'ℹ️ *No Limit Found*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n\n` +
    'This card does not currently have a spending limit. Nothing to remove.',
  cardModifierSetRecurringOnlyStart:
    '💬 *Enable Recurring-Only Modifier*\n\n' +
    'Please *REPLY* to this message with the card ID you want to enable *recurring-only payments* for.\n\n' +
    '(Send /cancel to cancel)',
  cardModifierUnsetRecurringOnlyStart:
    '💬 *Disable Recurring-Only Modifier*\n\n' +
    'Please *REPLY* to this message with the card ID you want to disable *recurring-only payments* for.\n\n' +
    '(Send /cancel to cancel)',
  cardModifierSetRecurringOnlySuccess: (cardName: string, last4: string) =>
    '✅ *Recurring-Only Enabled*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n\n` +
    'This card is now restricted to recurring payments only.',
  cardModifierUnsetRecurringOnlySuccess: (cardName: string, last4: string) =>
    '✅ *Recurring-Only Disabled*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n\n` +
    'This card is no longer restricted to recurring payments only.',
  cardModifierAlreadyEnabled: (cardName: string, last4: string) =>
    'ℹ️ *Modifier Already Enabled*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n\n` +
    'The recurring-only modifier is already enabled for this card.',
  cardModifierAlreadyDisabled: (cardName: string, last4: string) =>
    'ℹ️ *Modifier Already Disabled*\n\n' +
    `Card: *${MarkdownUtil.escapse(cardName)}* (••••${last4})\n\n` +
    'The recurring-only modifier is already disabled for this card.',
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
  transactionInfoPrompt: 'Please *REPLY* to this message with the transaction ID you want to look up.\n\n(Send /cancel to cancel)',
  errorFetchingTransactions: '❌ Error fetching transactions. Please try again later.',
  exportTransactionsSuccess: ({ count, fileName, uri }: { count: number, fileName: string, uri: string }) =>
    `✅ *Exported ${count} transactions*\n` +
    `File: ${fileName}\n` +
    `Download: ${uri}`,

  transactionCreated: (transaction: TransactionDataDTO, card: CardDto | undefined) => {
    const isFacebook = transaction.amountCents === -100;
    if (!isFacebook) return null;

    const escapeHtml = (text: string): string =>
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const cardInfo = card ? `${escapeHtml(card.name)} ••••${card.last4}` : 'N/A';
    const formattedDate = format(new Date(transaction.date), 'dd-MM-yy HH:mm');
    const desc = escapeHtml(transaction.merchantData?.description || 'FACEBOOK');

    return {
      text: `🔥 Mã xác minh Facebook\n${cardInfo} | <b>${desc}</b>\n${formattedDate}`,
      parse_mode: 'HTML' as const,
    };
  },

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
    `• Telegram ID: \`${user.telegramId ?? user.telegramIds?.join(',') ?? 'N/A'}\`\n` +
    `• Username: ${user.username ? `@${user.username}` : 'N/A'}\n` +
    `• Name: ${user.firstName || ''} ${user.lastName || ''}\n` +
    `• Virtual Account: ${user.virtualAccountId || 'Not linked'}\n` +
    `• Requested: ${user.accessRequestedAt ? new Date(user.accessRequestedAt).toLocaleString() : 'N/A'}\n\n` +
    `Choose an action:`,

  userAccessApproved: (user: UserDocument) =>
    `✅ *Access Approved*\n\n` +
    `User @${user.username || user.telegramId || user.telegramIds?.join(',')} has been granted access.`,

  userAccessDenied: (user: UserDocument, reason: string) =>
    `🚫 *Access Denied*\n\n` +
    `User @${user.username || user.telegramId || user.telegramIds?.join(',')} access has been denied.\n` +
    `Reason: ${reason}`,

  userAccessRevoked: (user: UserDocument, reason: string) =>
    `🚫 *Access Revoked*\n\n` +
    `User @${user.username || user.telegramId || user.telegramIds?.join(',')} access has been revoked.\n` +
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

  // ==================== Notification Destinations Messages ====================

  connectPrivateChatError:
    '⚠️ *Cannot Connect Private Chat*\n\n' +
    'This command can only be used in groups or channels.',

  connectNotAdminError:
    '🚫 *Admin Rights Required*\n\n' +
    'You must be an administrator of this group/channel to connect it for notifications.',

  connectSuccess: (chatTitle: string) =>
    `✅ *Connected Successfully!*\n\n` +
    `This chat (*${chatTitle}*) will now receive transaction notifications.`,

  connectUserNotFound: () =>
    `❌ *Không thể kết nối*\n\n` +
    `Không tìm thấy user hợp lệ với Telegram ID này. Vui lòng liên hệ admin để được thêm vào hệ thống.`,

  topicalertSuccess: (threadId: number) =>
    `✅ *Đã lưu topic cảnh báo*\n\n` +
    `Cảnh báo (balance/card) sẽ được gửi vào topic này (thread ID: ${threadId}).`,

  topicalertNotForum:
    '⚠️ Group này không phải forum group. Lệnh /topicalert chỉ hoạt động với forum groups.',

  topicalertInvalidThreadId:
    '❌ *Thread ID không hợp lệ*\n\n' +
    'Vui lòng nhập một số nguyên dương (ví dụ: 1, 2, 3...)\n\n' +
    'Gửi `/cancel` để hủy.',

  topicalertThreadIdPrompt: () =>
    `📝 *Nhập Thread ID*\n\n` +
    `Vui lòng nhập thread ID của topic bạn muốn chọn.\n\n` +
    `💡 *Cách lấy Thread ID:*\n` +
    `1. Vào topic bạn muốn chọn\n` +
    `2. Kiểm tra link của topic (ví dụ: \`t.me/c/.../85\`)\n` +
    `3. Số cuối cùng trong link chính là thread ID (ví dụ: 85)\n\n` +
    `Hoặc reply một message trong topic đó rồi gửi lại \`/topicalert\`.\n\n` +
    `(Gửi /cancel để hủy)`,

  disconnectPrivateChatError:
    '⚠️ *Cannot Disconnect Private Chat*\n\n' +
    'This command can only be used in groups or channels.',

  disconnectSuccess: (chatTitle: string) =>
    `✅ *Disconnected Successfully!*\n\n` +
    `This chat (*${chatTitle}*) will no longer receive transaction notifications.`,

  noDestinations:
    '📭 *No Connected Chats*\n\n' +
    'You have not connected any groups or channels for notifications.\n\n' +
    'To connect a chat:\n' +
    '1. Add this bot to your group/channel\n' +
    '2. Make sure you are an admin\n' +
    '3. Run /connect in that chat',

  destinationsList: (chats: Array<{ id: number; title: string; type: string }>) =>
    `📋 *Connected Notification Destinations*\n\n` +
    `Notifications will be sent to:\n\n` +
    chats.map((chat, index) =>
      `${index + 1}. *${chat.title}*\n` +
      `   Type: ${chat.type}\n` +
      `   ID: \`${chat.id}\``
    ).join('\n\n') +
    `\n\n💡 To disconnect a chat, run /disconnect in that chat.`,

  errorGeneric: '❌ An error occurred. Please try again later.',
  customTimePrompt: ` Please *REPLY* to this message with start and end dates in the format dd/MM/yyyy \n(ex: 01/01/2025-31/01/2025)\n\n` +
    `(Send /cancel to cancel)`,
  errorInvalidDate: '❌ Invalid date format. Please try again.',
  exportingTransactions: '⏳ *Generating your export...*\n\n' +
    'This may take a moment. You\'ll receive a download link when it\'s ready.',

  // Balance Alert
  balanceAlertsDigest: (
    items: ReadonlyArray<{ vaName: string; balanceUsd: number }>,
  ) => ({
    text: items.map((i) => formatVirtualAccountBalanceLine(i.vaName, i.balanceUsd)).join("\n"),
    parse_mode: "HTML" as const,
  }),

  // Card Spending Alert
  cardSpendingAlert: (
    cards: Array<{ cardName: string; amount: number | null }>,
    date: string,
    threshold: number,
  ) => ({
    text: cards.map((card) =>
      `⚠️ ${HtmlUtil.escape(card.cardName)} >${threshold}$`
    ).join('\n'),
    parse_mode: 'HTML' as const,
  }),
};
