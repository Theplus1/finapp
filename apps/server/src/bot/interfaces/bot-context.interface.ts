import { Context } from 'telegraf';
import { SessionStep } from '../constants/session-steps.constant';
import { UserDocument } from '../../users/users.schema';
import { VirtualAccountDocument } from 'src/database/schemas/virtual-account.schema';

export interface SessionData {
  step?: SessionStep;
  data?: Record<string, unknown>;
}

export interface BotContext extends Context {
  session?: SessionData;
  userData?: UserDocument;
  virtualAccount?: VirtualAccountDocument;
}
