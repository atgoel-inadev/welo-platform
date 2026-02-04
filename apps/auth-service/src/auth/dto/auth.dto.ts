import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'ADMIN',
  OPS_MANAGER = 'OPS_MANAGER',
  ANNOTATOR = 'ANNOTATOR',
  REVIEWER = 'REVIEWER',
  CUSTOMER = 'CUSTOMER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class LoginDto {
  @ApiProperty({ example: 'admin@welo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@welo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ANNOTATOR })
  @IsEnum(UserRole)
  role: UserRole;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
  expiresIn: number;
}

export class UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  createdAt: string;
}

export class TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
}
