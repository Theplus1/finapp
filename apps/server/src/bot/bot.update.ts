import { Update, Ctx, Start, Help, Command, On, Action } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { Logger, UseInterceptors } from '@nestjs/common';
import { BotContext } from './interfaces/bot-context.interface';
import { MenuHandler } from './features/menu/handlers/menu.handler';
import { SubscriptionHandler } from './features/subscription/handlers/subscription.handler';
import { OnboardingHandler } from './features/onboarding/handlers/onboarding.handler';
import { Messages } from './constants/messages.constant';
import { Keyboards } from './constants/keyboards.constant';
import { SessionSteps } from './constants/session-steps.constant';
import { CardsHandler } from './features/cards/handlers/cards.handler';
import { TransactionsHandler } from './features/transactions/handlers/transactions.handler';
import { Actions } from './constants/actions.constant';
import { UserValidationInterceptor } from './interceptors/user-validation.interceptor';
import { ValidateUser } from './decorators/validate-user.decorator';

@Update()
@UseInterceptors(UserValidationInterceptor)
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    private readonly menuHandler: MenuHandler,
    private readonly subscriptionHandler: SubscriptionHandler,
    private readonly onboardingHandler: OnboardingHandler,
    private readonly cardHandler: CardsHandler,
    private readonly transactionsHandler: TransactionsHandler,
  ) {}

  @ValidateUser({ answerCallback: true })
  @Start()
  async start(@Ctx() ctx: BotContext) {
    await ctx.sendChatAction('typing');
    return this.menuHandler.handleStart(ctx);
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.sendChatAction('typing');
    return this.menuHandler.handleHelp(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Command(Actions.menu.main)
  async menu(@Ctx() ctx: Context) {
    await ctx.sendChatAction('typing');
    return this.menuHandler.handleMenu(ctx);
  }

  @Command(Actions.menu.feedback)
  async startFeedback(@Ctx() ctx: BotContext) {
    await ctx.sendChatAction('typing');
    ctx.session = { step: SessionSteps.AWAITING_FEEDBACK, data: {} };
    await ctx.reply(Messages.feedbackStart, { parse_mode: 'Markdown' });
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.menu.main)
  async onMenuAction(@Ctx() ctx: BotContext) {
    await ctx.sendChatAction('typing');
    return this.menuHandler.handleMenuAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.menu.cards)
  async onCardsAction(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    return this.cardHandler.handleCardMenu(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.cards.list)
  async onCardsListAction(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    return this.cardHandler.exportCardsList(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.cards.detail)
  async onCardDetailAction(@Ctx() ctx: BotContext) {
    ctx.session = { step: SessionSteps.AWAITING_CARD_ID, data: {} };
    await ctx.reply(Messages.cardDetailStart, { parse_mode: 'Markdown' });
  }

  // @Action('card.action.lock')
  // async onCardLockAction(@Ctx() ctx: BotContext) {
  //   await ctx.answerCbQuery();
  //   const callbackQuery = ctx.callbackQuery;
  //   if (!callbackQuery || !('data' in callbackQuery)) return;
    
  //   const match = callbackQuery.data.match(/^card_(.+)$/);
  //   if (!match) return;
  //   await ctx.sendChatAction('typing');
  //   const cardId = match[1];
  //   return this.cardHandler.handleCardLock(ctx, cardId);
  // }

  // @Action('card.action.unlock')
  // async onCardUnlockAction(@Ctx() ctx: BotContext) {
  //   await ctx.answerCbQuery();
  //   const callbackQuery = ctx.callbackQuery;
  //   if (!callbackQuery || !('data' in callbackQuery)) return;
    
  //   const match = callbackQuery.data.match(/^card_(.+)$/);
  //   if (!match) return;
  //   await ctx.sendChatAction('typing');
  //   const cardId = match[1];
  //   return this.cardHandler.handleCardUnlock(ctx, cardId);
  // }

  // ==================== Transaction Actions ====================
  @ValidateUser({ answerCallback: true })
  @Action(Actions.menu.transaction)
  async onTransactionAction(@Ctx() ctx: BotContext) {
    return this.menuHandler.handleTransactionAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.transaction.notification)
  async onTransactionNotificationAction(@Ctx() ctx: BotContext) {
    return this.menuHandler.handleTransactionNotificationAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.transaction.subscribeNotification)
  async onSubscribeTransactionsAction(@Ctx() ctx: BotContext) {
    return this.transactionsHandler.handleSubscribeTransactionsAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.transaction.unsubscribeNotification)
  async onUnsubscribeTransactionsAction(@Ctx() ctx: BotContext) {
    return this.transactionsHandler.handleUnsubscribeTransactionsAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.transaction.list)
  async onTransactionListAction(@Ctx() ctx: BotContext) {
    return this.transactionsHandler.handleTransactionListAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(/^transaction.action.list.(?!s_)(.+)$/)
  async onTransactionExportAction(@Ctx() ctx: BotContext) {
    return this.transactionsHandler.handleTransactionExportAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.transaction.detail)
  async onTransactionDetailAction(@Ctx() ctx: BotContext) {
    return this.transactionsHandler.handleTransactionDetailAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action('subscribe')
  async onSubscribeAction(@Ctx() ctx: BotContext) {
    return this.subscriptionHandler.handleSubscribeAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action('unsubscribe')
  async onUnsubscribeAction(@Ctx() ctx: BotContext) {
    return this.subscriptionHandler.handleUnsubscribeAction(ctx);
  }

  @ValidateUser({ answerCallback: true })
  @Action(Actions.menu.about)
  async onAboutAction(@Ctx() ctx: BotContext) {
    return this.menuHandler.handleAboutAction(ctx);
  }

  @Action(Actions.menu.feedback)
  async onStartFeedbackAction(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    await this.startFeedback(ctx);
  }

  // ==================== Admin Actions ====================
  // Note: Admin operations are now handled via REST API
  // See /admin endpoints in AdminController


  // TODO: Move to FeedbackHandler
  @ValidateUser({ answerCallback: true })
  @On('text')
  async onText(@Ctx() ctx: BotContext) {
    if (!this.isValidTextMessage(ctx)) return;

    // Type guard ensures these are defined
    const text = (ctx.message as any).text.trim();

    if (this.isCancelCommand(text)) {
      return this.handleCancelCommand(ctx);
    }

    return this.handleUserText(ctx, text);
  }

  private async handleUserText(ctx: BotContext, text: string) {
    switch (ctx.session?.step) {
      case SessionSteps.AWAITING_ACCOUNT_NUMBER:
        await this.handleAccountNumberInput(ctx, text);
        break;
      case SessionSteps.AWAITING_FEEDBACK:
        await this.handleFeedbackInput(ctx, text);
        break;
      case SessionSteps.AWAITING_RATING:
        await this.handleRatingInput(ctx, text);
        break;
      case SessionSteps.AWAITING_TRANSACTION_ID:
        await this.transactionsHandler.handleTransactionInput(ctx, text);
        break;
      case SessionSteps.AWAITING_CARD_ID:
        await this.cardHandler.handleCardDetail(ctx, text);
        break;
    }
  }

  private isValidTextMessage(ctx: BotContext): ctx is BotContext & { message: { text: string }; session: NonNullable<BotContext['session']> } {
    return !!ctx.session?.step && !!ctx.message && 'text' in ctx.message && !!ctx.message.text;
  }

  private isCancelCommand(text: string): boolean {
    return text === '/cancel';
  }

  private async handleCancelCommand(ctx: BotContext): Promise<void> {
    let cancelMessage = '';
    switch (ctx.session?.step) {
      case SessionSteps.AWAITING_ACCOUNT_NUMBER:
        cancelMessage = Messages.replyCancelled;
        break;
      case SessionSteps.AWAITING_FEEDBACK:
        cancelMessage = Messages.replyCancelled;
        break;
      case SessionSteps.AWAITING_RATING:
        cancelMessage = Messages.replyCancelled;
        break;
      case SessionSteps.AWAITING_TRANSACTION_ID:
        cancelMessage = Messages.replyCancelled;
        break;
      default:
        cancelMessage = Messages.replyCancelled;
        break;
    }
    ctx.session = undefined;
    await ctx.reply(cancelMessage, Keyboards.removeKeyboard());
  }

  private async handleFeedbackInput(ctx: BotContext, text: string): Promise<void> {
    if (!ctx.session) return;
    
    ctx.session.data = { feedback: text };
    ctx.session.step = SessionSteps.AWAITING_RATING;
    await ctx.reply(Messages.feedbackRating, {
      parse_mode: 'Markdown',
      ...Keyboards.feedbackRating(),
    });
  }

  private async handleRatingInput(ctx: BotContext, text: string): Promise<void> {
    if (!ctx.session) return;

    const rating = parseInt(text, 10);

    if (!this.isValidRating(rating)) {
      await ctx.reply(Messages.feedbackInvalidRating);
      return;
    }

    const feedback = ctx.session.data?.feedback as string;
    ctx.session = undefined;

    this.logger.log(`Feedback received: ${feedback}, Rating: ${rating}`);

    await ctx.reply(Messages.feedbackThankYou(feedback, rating), {
      parse_mode: 'Markdown',
      ...Keyboards.removeKeyboard(),
    });
  }

  private isValidRating(rating: number): boolean {
    return !isNaN(rating) && rating >= 1 && rating <= 5;
  }

  private async handleAccountNumberInput(ctx: BotContext, vitualAccountId: string): Promise<void> {
    const user = ctx.from;
    if (!user) return;

    const trimmedVitualAccountId = vitualAccountId.trim();

    if (!this.isValidAccountNumber(trimmedVitualAccountId)) {
      await ctx.reply(Messages.accountNumberInvalid, { parse_mode: 'Markdown' });
      return;
    }

    // TODO: Add more validation logic here if needed
    // For example: check if account number exists in your system

    await this.onboardingHandler.linkAccountToUser(ctx, user.id, trimmedVitualAccountId);
  }

  private isValidAccountNumber(accountNumber: string): boolean {
    return accountNumber.length > 0;
  }
}
