import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ description: 'Admin username', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Admin password', example: 'your-secure-password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class AdminLoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Token expiration time in seconds', example: 86400 })
  expiresIn: number;

  @ApiProperty({ description: 'Admin username' })
  username: string;
}

export class AdminProfileDto {
  @ApiProperty({ description: 'Admin user ID' })
  id: string;

  @ApiProperty({ description: 'Admin username' })
  username: string;

  @ApiProperty({ description: 'Admin role', enum: ['super-admin', 'admin'] })
  role: string;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;
}
