import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { NonceRequestDto } from './dto/nonce-request.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @ApiOperation({
    summary: 'Request authentication nonce',
    description:
      'Get a unique nonce for wallet signature authentication. This is the first step in the Sign-In With Ethereum flow.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    schema: {
      type: 'object',
      properties: {
        nonce: { type: 'string', example: 'abc123def456' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid address format' })
  async getNonce(@Body() body: NonceRequestDto) {
    const nonce = await this.authService.generateNonce(body.address);
    return { nonce };
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verify wallet signature',
    description:
      'Verify the signed message and authenticate the user. Returns a JWT token in an HTTP-only cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful - JWT token set in cookie',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Authentication successful' },
        user: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            },
            role: { type: 'string', example: 'spender' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or expired nonce',
  })
  async verify(
    @Body() body: VerifySignatureDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, user } = await this.authService.verifySignature(
      body.address,
      body.message,
      body.signature,
    );

    // Set HTTP-only cookie
    response.cookie('spendos_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return {
      message: 'Authentication successful',
      user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiCookieAuth('spendos_token')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Retrieve the currently authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user retrieved',
    schema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        },
        role: { type: 'string', example: 'spender' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getCurrentUser(@User() user: any) {
    return await this.authService.getCurrentUser(user.address);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Clear the authentication cookie and log out the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('spendos_token');
    return {
      statusCode: HttpStatus.OK,
      message: 'Logout successful',
    };
  }
}
