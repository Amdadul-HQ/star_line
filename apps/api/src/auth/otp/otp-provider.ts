/**
 * SMS/OTP delivery abstraction. Production providers (e.g. an SMS gateway
 * for +880 numbers) implement this interface and are swapped via the
 * OTP_PROVIDER env value — authentication code never talks to a vendor SDK.
 */
export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

export interface OtpProvider {
  /** Deliver the code to the phone. Must not throw for transient issues it can retry internally. */
  sendOtp(phone: string, code: string): Promise<void>;
}
