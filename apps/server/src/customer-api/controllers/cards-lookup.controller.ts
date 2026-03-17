import {
  Controller,
  Get,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../admin-api/guards/jwt-auth.guard';
import { RolesGuard } from '../../admin-api/guards/roles.guard';
import { Roles } from '../../admin-api/decorators/roles.decorator';
import { CardsService } from '../../domain/cards/cards.service';
import { CUSTOMER_API_ROLES } from '../../common/constants/auth.constants';

interface RequestUser {
  userId: string;
  username: string;
  role: string;
  virtualAccountId?: string;
  bossId?: string;
}

@ApiTags('Customer API - Cards Lookup')
@ApiBearerAuth()
@Controller('customer-api/cards-lookup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CUSTOMER_API_ROLES)
export class CustomerCardsLookupController {
  constructor(
    private readonly cardsService: CardsService,
  ) {}

  private getVirtualAccountId(req: { user?: RequestUser }): string {
    const vaId = req.user?.virtualAccountId;
    if (!vaId) {
      throw new ForbiddenException('No virtual account linked to this user');
    }
    return vaId;
  }

  @Get()
  @ApiOperation({
    summary: 'List cards for filters (minimal fields)',
    description:
      'Returns minimal card info for building filter dropdowns on transaction list. Available for all customer roles.',
  })
  @ApiResponse({ status: 200, description: 'Cards retrieved successfully' })
  async listForFilters(
    @Request() req: { user?: RequestUser },
  ): Promise<Array<{ slashId: string; name: string; last4: string }>> {
    const virtualAccountId = this.getVirtualAccountId(req);

    const cards = await this.cardsService.findByVirtualAccountId(
      virtualAccountId,
      { limit: 2000, skip: 0 },
    );

    return cards.map((c) => ({
      slashId: c.slashId,
      name: c.name,
      last4: c.last4,
    }));
  }
}

