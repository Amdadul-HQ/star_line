/**
 * Payment gateway abstraction (spec §47). BookingService never talks to a
 * vendor SDK — it only ever sees this port. Providers are selected via the
 * PAYMENT_PROVIDER env value:
 *
 *   sandbox     built-in fake gateway (works with zero configuration)
 *   sslcommerz  SSLCommerz hosted checkout — presents bKash, Nagad, Rocket,
 *               cards and net-banking inside its gateway page
 *
 * A direct bKash (tokenized checkout) or Nagad provider implements this same
 * interface and registers alongside them.
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreateSessionInput {
  bookingId: string;
  bookingCode: string;
  amountBdt: number;
  description: string;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  /** Provider must send the payer back through these API callback URLs. */
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

export interface PaymentSession {
  /** Hosted checkout page the passenger is redirected to. */
  redirectUrl: string;
  /** Gateway session/transaction reference to persist on the Payment row. */
  providerRef: string;
}

export interface PaymentProviderPort {
  readonly name: string;
  createSession(input: CreateSessionInput): Promise<PaymentSession>;
}
