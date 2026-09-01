import { Injectable, Logger } from '@nestjs/common';
import type { OtpProvider } from './otp-provider';

/** Development provider — logs the code instead of sending an SMS. */
@Injectable()
export class SandboxOtpProvider implements OtpProvider {
  private readonly logger = new Logger('SandboxOtp');

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`[SANDBOX SMS] OTP for ${phone}: ${code}`);
  }
}
