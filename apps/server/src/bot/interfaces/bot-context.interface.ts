import { Context } from 'telegraf';
import { SessionStep } from '../constants/session-steps.constant';
import { UserDocument } from '../../users/users.schema';

export interface SessionData {
  step?: SessionStep;
  data?: Record<string, unknown>;
}

export interface BotContext extends Context {
  session?: SessionData;
  userData?: UserDocument;
}
