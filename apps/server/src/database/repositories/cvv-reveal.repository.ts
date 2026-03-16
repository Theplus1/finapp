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

  async create(data: {
    cardSlashId: string;
    virtualAccountId: string;
    revealedByUserId: string;
    revealedByUsername: string;
  }): Promise<CvvRevealDocument> {
    const doc = new this.model({
      ...data,
      revealedAt: new Date(),
    });
    const saved = await doc.save();
    this.logger.log(
      `Recorded CVV reveal for card ${data.cardSlashId} by ${data.revealedByUsername}`,
    );
    return saved;
  }

  async findByCardSlashId(
    cardSlashId: string,
    page: number,
    limit: number,
  ): Promise<[CvvRevealDocument[], number]> {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 20;

    const query = this.model.find({ cardSlashId }).sort({ revealedAt: -1 });
    const [items, total] = await Promise.all([
      query
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.model.countDocuments({ cardSlashId }).exec(),
    ]);

    return [items, total];
  }
}

