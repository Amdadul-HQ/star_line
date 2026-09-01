import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SandboxPaymentProvider } from './providers/sandbox.provider';
import { SslCommerzPaymentProvider } from './providers/sslcommerz.provider';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    SandboxPaymentProvider,
    SslCommerzPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (
        config: ConfigService,
        sandbox: SandboxPaymentProvider,
        sslcommerz: SslCommerzPaymentProvider,
      ) => (config.get('PAYMENT_PROVIDER') === 'sslcommerz' ? sslcommerz : sandbox),
      inject: [ConfigService, SandboxPaymentProvider, SslCommerzPaymentProvider],
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
