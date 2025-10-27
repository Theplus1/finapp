import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkAccountDto {
  @ApiProperty({ 
    description: 'Telegram ID of the user to link',
    example: 123456789 
  })
  @IsNumber()
  telegramId: number;
}

export class LinkAccountResponseDto {
  @ApiProperty({ description: 'Virtual Account Slash ID' })
  slashId: string;

  @ApiProperty({ description: 'Account name' })
  name: string;

  @ApiProperty({ description: 'Linked Telegram ID' })
  linkedTelegramId: number;

  @ApiProperty({ description: 'Linked User ID', required: false })
  linkedUserId?: string;

  @ApiProperty({ description: 'When the link was created' })
  linkedAt: Date;

  @ApiProperty({ description: 'Admin who created the link', required: false })
  linkedBy?: string;
}
