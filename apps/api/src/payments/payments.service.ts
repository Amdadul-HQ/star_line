import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES, type PaymentInitDto } from '@starline/shared';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import type { RequestUser } from '../common/types';
import { EVENTS } from '../events/events';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type PaymentProviderPort } from './payment-provider';

export type PaymentOutcome = 'success' | 'fail' | 'cancel';

const OUTCOME_TO_WEB_STATUS: Record<PaymentOutcome, string> = {
  success: 'confirmed',
  fail: 'failed',
  cancel: 'cancelled',
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProviderPort,
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  webResultUrl(bookingCode: string, outcome: PaymentOutcome): string {
    const web = this.config.get<string>('WEB_BASE_URL');
    return `${web}/booking/result?code=${encodeURIComponent(bookingCode)}&status=${OUTCOME_TO_WEB_STATUS[outcome]}`;
  }

  /** Start (or restart) checkout for a PENDING booking owned by the caller. */
  async initiateForBooking(bookingId: string, user: RequestUser): Promise<PaymentInitDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        trip: { include: { route: { select: { name: true } } } },
        passenger: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.passengerId !== user.id) throw AppError.forbidden();
    if (booking.status !== 'PENDING' || !booking.payment || booking.payment.status === 'PAID') {
      throw AppError.conflict('Booking is not awaiting payment', ERROR_CODES.BOOKING_NOT_PAYABLE);
    }

    const api = this.config.get<string>('API_BASE_URL');
    const session = await this.provider.createSession({
      bookingId: booking.id,
      bookingCode: booking.code,
      amountBdt: booking.fareTotalBdt,
      description: `Star Line ticket ${booking.trip.route.name}`,
      customer: {
        name: booking.passenger.name,
        phone: booking.passenger.phone,
        email: booking.passenger.email,
      },
      successUrl: `${api}/payments/sslcommerz/success`,
      failUrl: `${api}/payments/sslcommerz/fail`,
      cancelUrl: `${api}/payments/sslcommerz/cancel`,
    });

    await this.prisma.payment.update({
      where: { id: booking.payment.id },
      data: {
        provider: this.provider.name,
        providerRef: session.providerRef,
        ...(this.provider.name === 'sandbox' ? { method: 'SANDBOX' } : {}),
      },
    });

    return {
      redirectUrl: session.redirectUrl,
      provider: this.provider.name,
      bookingCode: booking.code,
    };
  }

  private mapMethod(cardType?: string | null): 'BKASH' | 'NAGAD' | 'CARD' {
    const value = (cardType ?? '').toLowerCase();
    if (value.includes('bkash')) return 'BKASH';
    if (value.includes('nagad')) return 'NAGAD';
    return 'CARD';
  }

  /**
   * Final outcome from a verified gateway callback. Idempotent: replays of a
   * paid booking are no-ops. Fail/cancel releases the reserved seats.
   */
  async applyOutcome(
    bookingCode: string,
    outcome: PaymentOutcome,
    meta: { providerRef?: string; cardType?: string } = {},
  ): Promise<{ webRedirect: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { code: bookingCode },
      include: { payment: true },
    });
    if (!booking || !booking.payment) {
      this.logger.warn(`Payment callback for unknown booking ${bookingCode}`);
      return { webRedirect: this.webResultUrl(bookingCode, 'fail') };
    }
    if (booking.payment.status === 'PAID') {
      // Duplicate/replayed callback — keep the first result.
      return { webRedirect: this.webResultUrl(bookingCode, 'success') };
    }

    if (outcome === 'success') {
      if (booking.status !== 'PENDING') {
        // Paid after the reservation expired — needs a manual refund.
        this.logger.error(
          `Booking ${bookingCode} paid but no longer PENDING (${booking.status}) — flagging for refund`,
        );
        await this.prisma.payment.update({
          where: { id: booking.payment.id },
          data: { status: 'REFUNDED', providerRef: meta.providerRef ?? booking.payment.providerRef },
        });
        return { webRedirect: this.webResultUrl(bookingCode, 'fail') };
      }
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: 'PAID',
            providerRef: meta.providerRef ?? booking.payment.providerRef,
            ...(this.provider.name !== 'sandbox' ? { method: this.mapMethod(meta.cardType) } : {}),
          },
        }),
        this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } }),
      ]);
      this.audit.log({
        actorId: booking.passengerId,
        action: 'BOOKING_PAID',
        entity: 'Booking',
        entityId: booking.id,
        after: { code: booking.code, amountBdt: booking.fareTotalBdt, provider: this.provider.name },
      });
      this.events.emit(EVENTS.BOOKING_CREATED, { bookingId: booking.id, tripId: booking.tripId });
      return { webRedirect: this.webResultUrl(bookingCode, 'success') };
    }

    // fail / cancel → release the seats so others can book them.
    await this.prisma.$transaction([
      this.prisma.bookingSeat.deleteMany({ where: { bookingId: booking.id } }),
      this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } }),
      this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: 'FAILED' },
      }),
    ]);
    this.events.emit(EVENTS.BOOKING_CANCELLED, { bookingId: booking.id, tripId: booking.tripId });
    this.audit.log({
      actorId: booking.passengerId,
      action: outcome === 'cancel' ? 'BOOKING_PAYMENT_CANCELLED' : 'BOOKING_PAYMENT_FAILED',
      entity: 'Booking',
      entityId: booking.id,
      after: { code: booking.code },
    });
    return { webRedirect: this.webResultUrl(bookingCode, outcome) };
  }

  /** Booking summary for the sandbox checkout page. */
  async sandboxSummary(bookingCode: string) {
    if (this.provider.name !== 'sandbox') {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Not found', HttpStatus.NOT_FOUND);
    }
    const booking = await this.prisma.booking.findUnique({
      where: { code: bookingCode },
      include: {
        trip: { include: { route: { select: { name: true } } } },
        seats: { select: { seatNumber: true } },
        payment: true,
      },
    });
    if (!booking || !booking.payment) throw AppError.notFound('Booking not found');
    return {
      code: booking.code,
      routeName: booking.trip.route.name,
      seats: booking.seats.map((s) => s.seatNumber),
      amountBdt: booking.fareTotalBdt,
      payable: booking.status === 'PENDING' && booking.payment.status !== 'PAID',
    };
  }

  assertSandboxEnabled(): void {
    if (this.provider.name !== 'sandbox') {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Not found', HttpStatus.NOT_FOUND);
    }
  }
}
