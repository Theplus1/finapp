import { Injectable } from '@nestjs/common';
import { SheetData } from '../../../integrations/google-sheets/services/google-sheets.service';
import { getCardColumns } from '../helpers/column-definitions.helper';
import { CardsService } from '../../cards/cards.service';

@Injectable()
export class CardsExportSheetService {
  constructor(private readonly cardsService: CardsService) {}

  async findAllCards(virtualAccountId: string) {
    return this.cardsService.findAllWithFilters({
      virtualAccountId,
    });
  }

  generateCardsSheet(cards: any[]): SheetData {
    const columns = getCardColumns();
    const headers = columns.map((col) => col.header);
    const rows = cards.map((card) => this.mapCardToRow(card, columns));

    return {
      name: 'Cards',
      headers,
      rows,
    };
  }

  private mapCardToRow(card: any, columns: any[]): any[] {
    return columns.map((column) => {
      if (typeof column.map === 'function') {
        return column.map(card);
      }
      return card[column.key] ?? '';
    });
  }
}
