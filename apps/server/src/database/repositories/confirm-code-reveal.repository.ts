import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfirmCodeReveal, ConfirmCodeRevealDocument } from '../schemas/confirm-code-reveal.schema';

@Injectable()
export class ConfirmCodeRevealRepository {
  constructor(
    @InjectModel(ConfirmCodeReveal.name)
    private readonly model: Model<ConfirmCodeRevealDocument>,
  ) {}

  async findByTransactionSlashId(
    transactionSlashId: string,
  ): Promise<ConfirmCodeRevealDocument | null> {
    return this.model.findOne({ transactionSlashId }).exec();
  }

  async create(data: {
    transactionSlashId: string;
    revealedByUserId: string;
    revealedByUsername: string;
  }): Promise<ConfirmCodeRevealDocument> {
    const doc = new this.model({
      ...data,
      revealedAt: new Date(),
    });
    return doc.save();
  }
}
