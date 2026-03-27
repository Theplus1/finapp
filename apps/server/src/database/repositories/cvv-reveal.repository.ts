import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvvReveal, CvvRevealDocument } from '../schemas/cvv-reveal.schema';

@Injectable()
export class CvvRevealRepository {
  private readonly logger = new Logger(CvvRevealRepository.name);

  constructor(
    @InjectModel(CvvReveal.name)
    private readonly model: Model<CvvRevealDocument>,
  ) {}

  async recordReveal(data: {
    cardSlashId: string;
    virtualAccountId: string;
    revealedByUserId: string;
    revealedByUsername: string;
  }): Promise<CvvRevealDocument> {
    const now = new Date();
    // append-only history: each reveal action is a dedicated record
    const doc = new this.model({
      ...data,
      revealedAt: now,
      lastRevealedAt: now,
      revealCount: 1,
    });
    const updated = await doc.save();
    this.logger.log(
      `Recorded CVV reveal for card ${data.cardSlashId} by ${data.revealedByUsername}`,
    );
    return updated;
  }

  async findByCardSlashId(
    cardSlashId: string,
    page: number,
    limit: number,
  ): Promise<[CvvRevealDocument[], number]> {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 20;

    const query = this.model
      .find({ cardSlashId })
      .sort({ revealedAt: -1, _id: -1 });
    const [items, total] = await Promise.all([
      query
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.model.countDocuments({ cardSlashId }).exec(),
    ]);

    return [items, total];
  }

  async findAllByCardSlashIds(
    cardSlashIds: string[],
  ): Promise<CvvRevealDocument[]> {
    if (cardSlashIds.length === 0) {
      return [];
    }
    return this.model
      .find({ cardSlashId: { $in: cardSlashIds } })
      .sort({ revealedAt: -1, _id: -1 })
      .exec();
  }
}

