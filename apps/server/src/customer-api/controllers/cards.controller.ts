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
import { CARDS_API_ROLES } from '../../common/constants/auth.constants';

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
  ) {}

  private getVirtualAccountId(req: { user?: RequestUser }): string {
    const vaId = req.user?.virtualAccountId;
    if (!vaId) {
      throw new ForbiddenException('No virtual account linked to this user');
    }
    return vaId;
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

    await this.slashApiService.updateCard(cardSlashId, { status: CardStatus.PAUSED });
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

    await this.slashApiService.updateCard(cardSlashId, { status: CardStatus.ACTIVE });
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

    await this.slashApiService.updateCardSpendingConstraint(
      cardSlashId,
      spendingConstraint,
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

    await this.slashApiService.updateCardSpendingConstraint(cardSlashId, null);
    this.logger.log(`Card ${cardSlashId} limit unset by ${req.user?.username}`);
    return { success: true, message: 'Spending limit removed successfully' };
  }
}
