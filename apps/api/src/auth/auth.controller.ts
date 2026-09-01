import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  staffLoginSchema,
  type OtpRequestInput,
  type OtpVerifyInput,
  type RefreshInput,
  type StaffLoginInput,
} from '@starline/shared';
import type { Request } from 'express';
import { CurrentUser, Public } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { AuthService } from './auth.service';

function meta(req: Request) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('staff/login')
  staffLogin(@Body(new ZodValidationPipe(staffLoginSchema)) body: StaffLoginInput, @Req() req: Request) {
    return this.auth.staffLogin(body.email, body.password, meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('passenger/otp/request')
  requestOtp(@Body(new ZodValidationPipe(otpRequestSchema)) body: OtpRequestInput) {
    return this.auth.requestOtp(body.phone);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('passenger/otp/verify')
  verifyOtp(@Body(new ZodValidationPipe(otpVerifySchema)) body: OtpVerifyInput, @Req() req: Request) {
    return this.auth.verifyOtp(body.phone, body.otp, body.name, meta(req));
  }

  @Public()
  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput, @Req() req: Request) {
    return this.auth.refresh(body.refreshToken, meta(req));
  }

  @Public()
  @Post('logout')
  logout(@Body() body: { refreshToken?: string }) {
    return this.auth.logout(body?.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }
}
