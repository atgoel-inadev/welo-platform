import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public, ResponseDto } from '@welo/common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @Public()
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() body: { email: string; password: string }) {
    // Placeholder implementation
    return new ResponseDto({
      accessToken: 'placeholder-jwt-token',
      refreshToken: 'placeholder-refresh-token',
      expiresIn: 3600,
      user: {
        id: 'user-uuid',
        email: body.email,
        role: 'ANNOTATOR',
      },
    });
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return new ResponseDto({
      accessToken: 'new-placeholder-jwt-token',
      expiresIn: 3600,
    });
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  async logout() {
    return new ResponseDto({ message: 'Logged out successfully' });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  async getCurrentUser() {
    return new ResponseDto({
      id: 'user-uuid',
      email: 'user@example.com',
      role: 'ANNOTATOR',
    });
  }
}
