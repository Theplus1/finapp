import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../admin-api/guards/jwt-auth.guard';
import { Roles } from '../../admin-api/decorators/roles.decorator';
import { RolesGuard } from '../../admin-api/guards/roles.guard';
import { CardsService } from '../../domain/cards/cards.service';
import { SlashApiService } from '../../integrations/slash/services/slash-api.service';
import { CustomerCardQueryDto } from '../dto/card-query.dto';
import { SetCardLimitDto } from '../dto/set-card-limit.dto';
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';
import { CardStatus } from '../../integrations/slash/dto/card.dto';
import type { CardWithRelations } from '../../domain/cards/types/card.types';
import { BOSS_AND_ACCOUNTANT_ROLES, CARDS_API_ROLES } from '../../common/constants/auth.constants';
import { CvvRevealRepository } from '../../database/repositories/cvv-reveal.repository';
import { SYNC_CONSTANTS } from '../../integrations/slash/constants/sync.constants';
import { ExportsService } from '../../domain/exports/exports.service';
import { ExportType } from '../../database/schemas/export-job.schema';

interface RequestUser {
  userId: string;
  username: string;
  role: string;
  virtualAccountId?: string;
  bossId?: string;
}

@ApiTags('Customer API - Cards')
@ApiBearerAuth()
@Controller('customer-api/cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CARDS_API_ROLES)
export class CustomerCardsController {
  private readonly logger = new Logger(CustomerCardsController.name);

  constructor(
    private readonly cardsService: CardsService,
    private readonly slashApiService: SlashApiService,
    private readonly cvvRevealRepository: CvvRevealRepository,
    private readonly exportsService: ExportsService,
  ) {}

  private getVirtualAccountId(req: { user?: RequestUser }): string {
    const vaId = req.user?.virtualAccountId;
    if (!vaId) {
      throw new ForbiddenException('No virtual account linked to this user');
    }
    return vaId;
  }

  @Post(':id/cvv')
  @ApiOperation({
    summary: 'Get CVV code for a card and record reveal history',
    description:
      'Fetch CVV from Slash vault for the given card (if it belongs to current virtual account) and record who retrieved it.',
  })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'CVV retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - card not in your VA' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getCvv(
    @Param('id') cardSlashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ cvv: string; last4: string; cardName: string }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(
      cardSlashId,
      virtualAccountId,
    );
    if (!owned) {
      throw new ForbiddenException(
        'Card not found or not in your virtual account',
      );
    }

    const card = await this.slashApiService.getCardDecrypted(
      cardSlashId,
      false,
      true,
    );
    if (!card || !card.cvv) {
      throw new BadRequestException('CVV is not available for this card');
    }

    const user = req.user;
    const revealedByUserId = user?.userId ?? '';
    const revealedByUsername = user?.username ?? '';
    if (!revealedByUserId || !revealedByUsername) {
      this.logger.warn(
        `Missing user information when recording CVV reveal for card ${cardSlashId}`,
      );
    }

    await this.cvvRevealRepository.recordReveal({
      cardSlashId,
      virtualAccountId,
      revealedByUserId: revealedByUserId || 'unknown',
      revealedByUsername: revealedByUsername || 'unknown',
    });

    this.logger.log(
      `CVV retrieved for card ${cardSlashId} by ${revealedByUsername || 'unknown'}`,
    );

    return {
      cvv: card.cvv,
      last4: card.last4 ?? '',
      cardName: card.name ?? '',
    };
  }

  @Get(':id/cvv-history')
  @ApiOperation({
    summary: 'List CVV reveal history for a card',
    description:
      'Returns who and when retrieved CVV for the given card, ordered by most recent first.',
  })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getCvvHistory(
    @Param('id') cardSlashId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Request() req: { user?: RequestUser },
  ): Promise<{
    cardId: string;
    data: Array<{
      revealedAt: Date;
      lastRevealedAt?: Date;
      revealCount: number;
      revealedByUserId: string;
      revealedByUsername: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(
      cardSlashId,
      virtualAccountId,
    );
    if (!owned) {
      throw new ForbiddenException(
        'Card not found or not in your virtual account',
      );
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [items, total] = await this.cvvRevealRepository.findByCardSlashId(
      cardSlashId,
      pageNum,
      limitNum,
    );

    const data = items.map((doc) => ({
      revealedAt: doc.revealedAt,
      lastRevealedAt: doc.lastRevealedAt ?? doc.revealedAt,
      revealCount: doc.revealCount ?? 1,
      revealedByUserId: doc.revealedByUserId,
      revealedByUsername: doc.revealedByUsername,
    }));

    const totalPages =
      limitNum > 0 ? Math.ceil(total / limitNum) || 1 : 1;

    return {
      cardId: cardSlashId,
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List cards for the current VA (Boss/NV)' })
  @ApiResponse({ status: 200, description: 'Cards retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no VA linked' })
  async list(
    @Query() query: CustomerCardQueryDto,
    @Request() req: { user?: RequestUser },
  ): Promise<{
    data: CardWithRelations[];
    pagination: { page: number; limit: number; total: number };
  }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    this.logger.log(`Listing cards for VA ${virtualAccountId}`);

    const [data, total] = await this.cardsService.findAllWithFilters(
      {
        virtualAccountId,
        status: query.status,
        cardGroupId: query.cardGroupId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        search: query.search,
      },
      {
        page: query.page ?? PAGINATION_DEFAULTS.PAGE,
        limit: query.limit ?? PAGINATION_DEFAULTS.LIMIT,
      },
    );

    return {
      data,
      pagination: {
        page: query.page ?? PAGINATION_DEFAULTS.PAGE,
        limit: query.limit ?? PAGINATION_DEFAULTS.LIMIT,
        total,
      },
    };
  }

  @Get('by-slash-id/:slashId')
  @ApiOperation({
    summary: 'Get one card by slashId with same shape as list',
  })
  @ApiParam({ name: 'slashId', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Card retrieved successfully' })
  async getOneBySlashId(
    @Param('slashId') slashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{
    data: CardWithRelations[];
    pagination: { page: number; limit: number; total: number };
  }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    this.logger.log(
      `Getting one card by slashId ${slashId} for VA ${virtualAccountId}`,
    );

    const [data, total] = await this.cardsService.findAllWithFilters(
      {
        virtualAccountId,
        slashId,
      },
      {
        page: 1,
        limit: 1,
      },
    );

    return {
      data,
      pagination: {
        page: 1,
        limit: 1,
        total,
      },
    };
  }

  @Post('export')
  @Roles(...BOSS_AND_ACCOUNTANT_ROLES)
  @ApiOperation({
    summary: 'Export cards and return download URL (boss/accountant)',
  })
  @ApiResponse({ status: 200, description: 'Export generated successfully' })
  async exportCards(
    @Query() query: CustomerCardQueryDto,
    @Request() req: { user?: RequestUser },
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: Date;
  }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Missing user ID for export');
    }

    const filters = {
      virtualAccountId,
      status: query.status,
      cardGroupId: query.cardGroupId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      search: query.search,
    };

    return this.exportsService.generateCardsExportDownloadUrlForWeb({
      userId,
      virtualAccountId,
      type: ExportType.CARDS,
      filters,
    });
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock card (pause)' })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Card locked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - card not in your VA' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async lock(
    @Param('id') cardSlashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ success: true; message: string }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(cardSlashId, virtualAccountId);
    if (!owned) {
      throw new ForbiddenException('Card not found or not in your virtual account');
    }

    const card = await this.slashApiService.getCard(cardSlashId, false, false);
    if (card.status === CardStatus.PAUSED) {
      throw new BadRequestException('Card is already locked');
    }

    const updated = await this.slashApiService.updateCard(cardSlashId, {
      status: CardStatus.PAUSED,
    });
    await this.cardsService.syncCardDocumentFromSlashDto(
      updated,
      SYNC_CONSTANTS.SYNC_SOURCE.MANUAL,
    );
    this.logger.log(`Card ${cardSlashId} locked by ${req.user?.username}`);
    return { success: true, message: 'Card locked successfully' };
  }

  @Post(':id/unlock')
  @ApiOperation({ summary: 'Unlock card (activate)' })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Card unlocked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - card not in your VA' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async unlock(
    @Param('id') cardSlashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ success: true; message: string }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(cardSlashId, virtualAccountId);
    if (!owned) {
      throw new ForbiddenException('Card not found or not in your virtual account');
    }

    const card = await this.slashApiService.getCard(cardSlashId, false, false);
    if (card.status === CardStatus.ACTIVE) {
      throw new BadRequestException('Card is already active');
    }
    if (card.status === CardStatus.CLOSED) {
      throw new BadRequestException('Cannot unlock a closed card');
    }

    const updated = await this.slashApiService.updateCard(cardSlashId, {
      status: CardStatus.ACTIVE,
    });
    await this.cardsService.syncCardDocumentFromSlashDto(
      updated,
      SYNC_CONSTANTS.SYNC_SOURCE.MANUAL,
    );
    this.logger.log(`Card ${cardSlashId} unlocked by ${req.user?.username}`);
    return { success: true, message: 'Card unlocked successfully' };
  }

  @Post(':id/set-recurring-only')
  @ApiOperation({
    summary: 'Set nạp trước (only allow recurring payments)',
    description: 'Enables modifier only_allow_recurring_payments for the card',
  })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Recurring-only modifier set successfully' })
  @ApiResponse({ status: 400, description: 'Modifier already enabled' })
  @ApiResponse({ status: 403, description: 'Forbidden - card not in your VA' })
  async setRecurringOnly(
    @Param('id') cardSlashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ success: true; message: string }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(cardSlashId, virtualAccountId);
    if (!owned) {
      throw new ForbiddenException('Card not found or not in your virtual account');
    }

    const card = await this.slashApiService.getCard(cardSlashId, false, false);
    const modifiers = await this.slashApiService.getCardModifiers(card.id);
    const existing = modifiers.find(
      (m) => m.name === 'only_allow_recurring_payments',
    );
    if (existing?.value === true) {
      throw new BadRequestException(
        'Card already has "nạp trước" (only recurring) enabled',
      );
    }

    await this.slashApiService.setCardModifier(card.id, {
      name: 'only_allow_recurring_payments',
      value: true,
    });
    const refreshed = await this.slashApiService.getCard(cardSlashId, false, false);
    await this.cardsService.syncCardDocumentFromSlashDto(
      refreshed,
      SYNC_CONSTANTS.SYNC_SOURCE.MANUAL,
      { isRecurringOnly: true },
    );
    this.logger.log(`Card ${cardSlashId} set recurring-only by ${req.user?.username}`);
    return { success: true, message: 'Recurring-only (nạp trước) set successfully' };
  }

  @Post(':id/unset-recurring-only')
  @ApiOperation({
    summary: 'Unset nạp trước (allow all payments)',
    description: 'Disables modifier only_allow_recurring_payments for the card',
  })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Recurring-only modifier unset successfully' })
  @ApiResponse({ status: 400, description: 'Modifier already disabled' })
  @ApiResponse({ status: 403, description: 'Forbidden - card not in your VA' })
  async unsetRecurringOnly(
    @Param('id') cardSlashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ success: true; message: string }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(cardSlashId, virtualAccountId);
    if (!owned) {
      throw new ForbiddenException('Card not found or not in your virtual account');
    }

    const card = await this.slashApiService.getCard(cardSlashId, false, false);
    const modifiers = await this.slashApiService.getCardModifiers(card.id);
    const existing = modifiers.find(
      (m) => m.name === 'only_allow_recurring_payments',
    );
    if (!existing || existing.value === false) {
      throw new BadRequestException(
        'Card does not have "nạp trước" (only recurring) enabled',
      );
    }

    await this.slashApiService.setCardModifier(card.id, {
      name: 'only_allow_recurring_payments',
      value: false,
    });
    const refreshed = await this.slashApiService.getCard(cardSlashId, false, false);
    await this.cardsService.syncCardDocumentFromSlashDto(
      refreshed,
      SYNC_CONSTANTS.SYNC_SOURCE.MANUAL,
      { isRecurringOnly: false },
    );
    this.logger.log(`Card ${cardSlashId} unset recurring-only by ${req.user?.username}`);
    return { success: true, message: 'Recurring-only (nạp trước) unset successfully' };
  }

  @Post(':id/set-limit')
  @ApiOperation({
    summary: 'Set spending limit for card',
    description:
      'Set utilization limit by preset (daily/weekly/monthly/yearly/collective) and amount in USD',
  })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiBody({ type: SetCardLimitDto })
  @ApiResponse({ status: 200, description: 'Spending limit set successfully' })
  @ApiResponse({ status: 400, description: 'Invalid amount or preset' })
  @ApiResponse({ status: 403, description: 'Forbidden - card not in your VA' })
  async setLimit(
    @Param('id') cardSlashId: string,
    @Body() dto: SetCardLimitDto,
    @Request() req: { user?: RequestUser },
  ): Promise<{ success: true; message: string }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(cardSlashId, virtualAccountId);
    if (!owned) {
      throw new ForbiddenException('Card not found or not in your virtual account');
    }

    const amountCents = Math.round(dto.amount * 100);
    if (amountCents <= 0) {
      throw new BadRequestException('Amount must be at least 0.01 USD');
    }

    const spendingConstraint = {
      spendingRule: {
        utilizationLimit: {
          limitAmount: { amountCents },
          preset: dto.preset,
        },
      },
    };

    const updated = await this.slashApiService.updateCardSpendingConstraint(
      cardSlashId,
      spendingConstraint,
    );
    await this.cardsService.syncCardDocumentFromSlashDto(
      updated,
      SYNC_CONSTANTS.SYNC_SOURCE.MANUAL,
    );
    this.logger.log(
      `Card ${cardSlashId} set limit ${dto.amount} USD (${dto.preset}) by ${req.user?.username}`,
    );
    return {
      success: true,
      message: `Spending limit set: ${dto.amount} USD per ${dto.preset}`,
    };
  }

  @Post(':id/unset-limit')
  @ApiOperation({ summary: 'Remove spending limit from card' })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Spending limit removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - card not in your VA' })
  async unsetLimit(
    @Param('id') cardSlashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ success: true; message: string }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const owned = await this.cardsService.verifyOwnership(cardSlashId, virtualAccountId);
    if (!owned) {
      throw new ForbiddenException('Card not found or not in your virtual account');
    }

    const updated = await this.slashApiService.updateCardSpendingConstraint(
      cardSlashId,
      null,
    );
    await this.cardsService.syncCardDocumentFromSlashDto(
      updated,
      SYNC_CONSTANTS.SYNC_SOURCE.MANUAL,
    );
    this.logger.log(`Card ${cardSlashId} limit unset by ${req.user?.username}`);
    return { success: true, message: 'Spending limit removed successfully' };
  }
}
