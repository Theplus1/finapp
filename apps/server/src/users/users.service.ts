import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOrCreate(
    telegramId: number,
    userData: Partial<User>,
  ): Promise<UserDocument> {
    let user = await this.userModel.findOne({ telegramId });

    if (!user) {
      user = new this.userModel({
        telegramId,
        ...userData,
      });
      await user.save();
      this.logger.log(`New user created: ${telegramId}`);
    }

    return user;
  }

  async findByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramId });
  }

  async updateSubscription(
    telegramId: number,
    isSubscribed: boolean,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { isSubscribed },
      { new: true },
    );

    this.logger.log(
      `User ${telegramId} subscription updated to: ${isSubscribed}`,
    );
    return user;
  }

  async getSubscribedUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ isSubscribed: true });
  }

  async getAllUsers(): Promise<UserDocument[]> {
    return this.userModel.find();
  }

  async linkAccountNumber(
    telegramId: number,
    virtualAccountId: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { virtualAccountId },
      { new: true },
    );

    this.logger.log(
      `User ${telegramId} linked to account number: ${virtualAccountId}`,
    );
    return user;
  }

  async findByAccountNumber(virtualAccountId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ virtualAccountId });
  }
}
