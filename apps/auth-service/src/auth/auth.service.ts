import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import {
  LoginDto,
  RegisterDto,
  AuthResponse,
  UserResponse,
  TokenPayload,
  UserRole,
  UserStatus,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/auth.dto';

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  createdAt: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  private users: User[] = [];
  private readonly usersFilePath = path.join(__dirname, 'mock-users.json');

  constructor(private readonly jwtService: JwtService) {
    this.loadUsers();
  }

  private loadUsers() {
    try {
      const data = fs.readFileSync(this.usersFilePath, 'utf8');
      this.users = JSON.parse(data);
      console.log(`Loaded ${this.users.length} mock users`);
    } catch (error) {
      console.error('Error loading mock users:', error);
      this.users = [];
    }
  }

  private saveUsers() {
    try {
      fs.writeFileSync(this.usersFilePath, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    // For mock users, simple comparison (passwords stored in plain text)
    // In production with Okta, this won't be used
    return password === hash;
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string; expiresIn: number } {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign({ userId: user.id }, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = this.users.find((u) => u.email === dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await this.comparePassword(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user);

    // Store refresh token
    user.refreshToken = tokens.refreshToken;
    this.saveUsers();

    return {
      ...tokens,
      user: this.toUserResponse(user),
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = this.users.find((u) => u.email === dto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: dto.email,
      password: dto.password, // In mock, store plain text. In production with Okta, hash it.
      name: dto.name,
      role: dto.role,
      permissions: this.getDefaultPermissions(dto.role),
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.saveUsers();

    const tokens = this.generateTokens(newUser);

    return {
      ...tokens,
      user: this.toUserResponse(newUser),
    };
  }

  async refreshToken(oldRefreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = this.jwtService.verify(oldRefreshToken);
      const user = this.users.find((u) => u.id === decoded.userId && u.refreshToken === oldRefreshToken);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }

      const tokens = this.generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      this.saveUsers();

      return {
        ...tokens,
        user: this.toUserResponse(user),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.refreshToken = undefined;
      this.saveUsers();
    }
  }

  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = this.users.find((u) => u.id === userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponse> {
    const user = this.users.find((u) => u.id === userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.email) {
      const emailExists = this.users.find((u) => u.email === dto.email && u.id !== userId);
      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }

    this.saveUsers();

    return this.toUserResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = this.users.find((u) => u.id === userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await this.comparePassword(dto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = dto.newPassword; // In mock, plain text. In production, hash it.
    this.saveUsers();
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.users.find((u) => u.id === userId) || null;
  }

  private getDefaultPermissions(role: UserRole): string[] {
    switch (role) {
      case UserRole.ADMIN:
        return ['*'];
      case UserRole.PROJECT_MANAGER:
        return [
          'project.create',
          'project.read',
          'project.update',
          'project.delete',
          'batch.create',
          'batch.read',
          'batch.update',
          'workflow.create',
          'workflow.read',
          'workflow.update',
          'task.read',
          'task.assign',
          'user.read',
        ];
      case UserRole.ANNOTATOR:
        return [
          'task.read',
          'task.claim',
          'task.submit',
          'annotation.create',
          'annotation.read',
          'annotation.update',
        ];
      case UserRole.REVIEWER:
        return [
          'task.read',
          'annotation.read',
          'annotation.review',
          'annotation.approve',
          'annotation.reject',
          'quality.read',
        ];
      case UserRole.CUSTOMER:
        return ['project.read', 'batch.read', 'report.read', 'export.download'];
      default:
        return [];
    }
  }
}
