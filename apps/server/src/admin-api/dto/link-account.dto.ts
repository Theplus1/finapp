import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkAccountDto {
  @ApiProperty({
    description: 'Telegram ID of the user to link',
    example: 123456789,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  telegramId?: number;

  @ApiPropertyOptional({
    description: 'Telegram IDs of the users to link',
    example: [123456789, 987654321],
  })
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @IsOptional()
  telegramIds?: number[];
}

export class LinkAccountResponseDto {
  @ApiProperty({ description: 'Virtual Account Slash ID' })
  slashId: string;

  @ApiProperty({ description: 'Account name' })
  name: string;

  // single telegram id
  @ApiPropertyOptional({ description: 'Linked Telegram ID' })
  linkedTelegramId?: number;

  // multiple telegram ids
  @ApiPropertyOptional({ description: 'Linked Telegram IDs' })
  linkedTelegramIds?: number[];

  @ApiProperty({ description: 'Linked User ID', required: false })
  linkedUserId?: string;

  @ApiProperty({ description: 'When the link was created' })
  linkedAt: Date;

  @ApiProperty({ description: 'Admin who created the link', required: false })
  linkedBy?: string;
}
