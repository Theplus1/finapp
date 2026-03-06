import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SetBossAccountDto {
  @ApiProperty({
    description: 'Boss username',
    example: 'boss_123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Boss password',
    example: 'StrongPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Boss email',
    example: 'boss@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}

