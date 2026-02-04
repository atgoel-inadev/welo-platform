import { Controller, Post, Get, Patch, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  UpdateProfileDto,
  ChangePasswordDto,
  AuthResponse,
  UserResponse,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      success: true,
      data: result,
      message: 'Login successful',
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: AuthResponse })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return {
      success: true,
      data: result,
      message: 'Registration successful',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return {
      success: true,
      data: result,
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req) {
    await this.authService.logout(req.user.userId);
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved', type: UserResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    const user = await this.authService.getCurrentUser(req.user.userId);
    return {
      success: true,
      data: user,
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    const user = await this.authService.updateProfile(req.user.userId, dto);
    return {
      success: true,
      data: user,
      message: 'Profile updated successfully',
    };
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.userId, dto);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate session and get user info' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  async validateSession(@Request() req) {
    const user = await this.authService.getCurrentUser(req.user.userId);
    return {
      success: true,
      data: {
        valid: true,
        user,
      },
    };
  }
}
