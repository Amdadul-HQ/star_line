import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { CreateSessionInput, PaymentProviderPort, PaymentSession } from '../payment-provider';

/**
 * Development gateway — mimics the SSLCommerz redirect dance (checkout page →
 * success/fail/cancel callback → redirect to the web app) without any
 * merchant account, so the booking flow is fully testable locally.
 */
@Injectable()
export class SandboxPaymentProvider implements PaymentProviderPort {
  readonly name = 'sandbox';

  constructor(private readonly config: ConfigService) {}

  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    const apiBase = this.config.get<string>('API_BASE_URL');
    const providerRef = `SBX-${randomUUID().slice(0, 8).toUpperCase()}`;
    return {
      providerRef,
      redirectUrl: `${apiBase}/payments/sandbox/checkout/${input.bookingCode}`,
    };
  }
}
