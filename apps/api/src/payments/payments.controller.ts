import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { PaymentsService, type PaymentOutcome } from './payments.service';
import { SslCommerzPaymentProvider } from './providers/sslcommerz.provider';

/**
 * Gateway-facing endpoints (all public — the payer's browser and the gateway
 * server hit them). Success is only trusted after server-side validation.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly sslcommerz: SslCommerzPaymentProvider,
  ) {}

  // ------------------------------------------------------ sandbox gateway

  /** Fake hosted checkout page (dev only — 404 when a real provider is active). */
  @Public()
  @ApiExcludeEndpoint()
  @Get('sandbox/checkout/:code')
  async sandboxCheckout(@Param('code') code: string, @Res() res: Response) {
    const summary = await this.payments.sandboxSummary(code);
    const complete = (outcome: string) => `/payments/sandbox/complete/${summary.code}?outcome=${outcome}`;
    res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Star Line — Sandbox Gateway</title>
<style>
  body{font-family:-apple-system,'Segoe UI',sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(15,23,42,.12);padding:32px;max-width:400px;width:92%}
  .tag{display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:.04em}
  h1{font-size:18px;color:#0f172a;margin:14px 0 2px} p{color:#475569;font-size:14px;margin:4px 0}
  .amount{font-size:34px;font-weight:800;color:#C4121F;margin:14px 0}
  .btn{display:block;text-align:center;text-decoration:none;font-weight:700;font-size:15px;border-radius:10px;padding:13px;margin-top:10px}
  .pay{background:#C4121F;color:#fff}.fail{background:#fff;border:1.5px solid #e2e8f0;color:#475569}.cancel{background:#fff;color:#94a3b8;font-size:13px}
</style></head><body>
<div class="card">
  <span class="tag">SANDBOX GATEWAY</span>
  <h1>Star Line Payment</h1>
  <p>${summary.routeName} · Seats ${summary.seats.join(', ')}</p>
  <p>Booking <strong>${summary.code}</strong></p>
  <div class="amount">৳${summary.amountBdt.toLocaleString()}</div>
  ${
    summary.payable
      ? `<a class="btn pay" href="${complete('success')}">Pay ৳${summary.amountBdt.toLocaleString()} (simulate success)</a>
         <a class="btn fail" href="${complete('fail')}">Simulate failure</a>
         <a class="btn cancel" href="${complete('cancel')}">Cancel payment</a>`
      : `<p><strong>This booking is not awaiting payment.</strong></p>
         <a class="btn fail" href="${this.payments.webResultUrl(summary.code, 'success')}">Back to Star Line</a>`
  }
</div></body></html>`);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Get('sandbox/complete/:code')
  async sandboxComplete(
    @Param('code') code: string,
    @Query('outcome') outcome: string,
    @Res() res: Response,
  ) {
    this.payments.assertSandboxEnabled();
    const normalized: PaymentOutcome =
      outcome === 'success' ? 'success' : outcome === 'cancel' ? 'cancel' : 'fail';
    const { webRedirect } = await this.payments.applyOutcome(code, normalized, {
      providerRef: `SBX-${normalized.toUpperCase()}`,
    });
    res.redirect(302, webRedirect);
  }

  // --------------------------------------------------- SSLCommerz callbacks

  @Public()
  @ApiExcludeEndpoint()
  @Post('sslcommerz/success')
  async sslczSuccess(
    @Body() body: { tran_id?: string; val_id?: string },
    @Res() res: Response,
  ) {
    const code = body.tran_id ?? '';
    let outcome: PaymentOutcome = 'fail';
    let cardType: string | undefined;
    let providerRef: string | undefined;
    if (code && body.val_id) {
      const validation = await this.sslcommerz.validate(body.val_id);
      if (validation.status === 'VALID' || validation.status === 'VALIDATED') {
        outcome = 'success';
        cardType = validation.card_type;
        providerRef = validation.val_id;
      }
    }
    const { webRedirect } = await this.payments.applyOutcome(code, outcome, {
      cardType,
      providerRef,
    });
    res.redirect(302, webRedirect);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Post('sslcommerz/fail')
  async sslczFail(@Body() body: { tran_id?: string }, @Res() res: Response) {
    const { webRedirect } = await this.payments.applyOutcome(body.tran_id ?? '', 'fail');
    res.redirect(302, webRedirect);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Post('sslcommerz/cancel')
  async sslczCancel(@Body() body: { tran_id?: string }, @Res() res: Response) {
    const { webRedirect } = await this.payments.applyOutcome(body.tran_id ?? '', 'cancel');
    res.redirect(302, webRedirect);
  }
}
