import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OTP_PROVIDER } from './otp/otp-provider';
import { SandboxOtpProvider } from './otp/sandbox-otp.provider';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    // Swap implementation per OTP_PROVIDER env when a real SMS gateway lands.
    { provide: OTP_PROVIDER, useClass: SandboxOtpProvider },
  ],
  exports: [TokenService],
})
export class AuthModule {}
