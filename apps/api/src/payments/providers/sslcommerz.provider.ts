import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '@starline/shared';
import { AppError } from '../../common/errors';
import type { CreateSessionInput, PaymentProviderPort, PaymentSession } from '../payment-provider';

interface SslczSessionResponse {
  status: 'SUCCESS' | 'FAILED';
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
}

interface SslczValidationResponse {
  status: string; // VALID | VALIDATED | INVALID_TRANSACTION | ...
  tran_id?: string;
  amount?: string;
  card_type?: string;
  val_id?: string;
}

/**
 * SSLCommerz hosted checkout (v4). The gateway page itself offers bKash,
 * Nagad, Rocket, cards and internet banking — one integration covers the
 * common Bangladeshi payment methods. Enable by setting:
 *   PAYMENT_PROVIDER=sslcommerz
 *   SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD  (sandbox creds are free
 *   at https://developer.sslcommerz.com — SSLCOMMERZ_SANDBOX=true)
 */
@Injectable()
export class SslCommerzPaymentProvider implements PaymentProviderPort {
  readonly name = 'sslcommerz';
  private readonly logger = new Logger(SslCommerzPaymentProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<boolean>('SSLCOMMERZ_SANDBOX')
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
  }

  private credentials(): { storeId: string; storePassword: string } {
    const storeId = this.config.get<string>('SSLCOMMERZ_STORE_ID');
    const storePassword = this.config.get<string>('SSLCOMMERZ_STORE_PASSWORD');
    if (!storeId || !storePassword) {
      throw new AppError(
        ERROR_CODES.PAYMENT_INIT_FAILED,
        'SSLCommerz store credentials are not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { storeId, storePassword };
  }

  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    const { storeId, storePassword } = this.credentials();
    const body = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: String(input.amountBdt),
      currency: 'BDT',
      tran_id: input.bookingCode,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      cancel_url: input.cancelUrl,
      shipping_method: 'NO',
      product_name: input.description,
      product_category: 'Bus Ticket',
      product_profile: 'general',
      cus_name: input.customer.name,
      cus_email: input.customer.email ?? 'passenger@starline.local',
      cus_add1: 'Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: input.customer.phone ?? '+8800000000000',
    });

    const res = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as SslczSessionResponse;
    if (json.status !== 'SUCCESS' || !json.GatewayPageURL) {
      this.logger.error(`SSLCommerz session failed: ${json.failedreason ?? 'unknown'}`);
      throw new AppError(
        ERROR_CODES.PAYMENT_INIT_FAILED,
        'Could not create SSLCommerz session',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return { redirectUrl: json.GatewayPageURL, providerRef: json.sessionkey ?? input.bookingCode };
  }

  /** Server-side verification of a success callback (never trust the POST alone). */
  async validate(valId: string): Promise<SslczValidationResponse> {
    const { storeId, storePassword } = this.credentials();
    const url =
      `${this.baseUrl}/validator/api/validationserverAPI.php?` +
      new URLSearchParams({
        val_id: valId,
        store_id: storeId,
        store_passwd: storePassword,
        format: 'json',
      });
    const res = await fetch(url);
    return (await res.json()) as SslczValidationResponse;
  }
}
