import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
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
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT refresh token' })
  @IsString()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Updated display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'jane@welo.com', description: 'Updated email address' })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123', description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newSecurePass456', description: 'New password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class UserResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'admin@welo.com' })
  email: string;

  @ApiProperty({ example: 'John Admin' })
  name: string;

  @ApiProperty({ enum: UserRole, example: 'ADMIN' })
  role: UserRole;

  @ApiProperty({ example: ['projects:read', 'projects:write', 'tasks:read', 'tasks:write', 'users:manage'], description: 'User permissions' })
  permissions: string[];

  @ApiProperty({ enum: UserStatus, example: 'ACTIVE' })
  status: UserStatus;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  createdAt: string;
}

export class AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImFkbWluQHdlbG8uY29tIiwicm9sZSI6IkFETUlOIn0', description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...refresh', description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Authenticated user details', type: () => UserResponse })
  user: UserResponse;

  @ApiProperty({ example: 86400, description: 'Token expiration time in seconds' })
  expiresIn: number;
}

export class TokenPayload {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ example: 'admin@welo.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: 'ADMIN' })
  role: UserRole;

  @ApiProperty({ example: ['projects:read', 'projects:write'] })
  permissions: string[];
}

/**
 * User Management DTOs
 */
export class CreateUserDto {
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

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, required: false })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'jane@welo.com', description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.REVIEWER, description: 'User role' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'Account status' })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'newPassword123', description: 'New password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
