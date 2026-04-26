import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckoutInput,
  CheckoutResult,
  PaymentProviderPort,
  RefundResult,
  RetrievedPaymentResult,
} from './payment-provider.interface';

@Injectable()
export class IyzicoProvider implements PaymentProviderPort {
  private readonly apiKey?: string;
  private readonly secretKey?: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('IYZICO_API_KEY');
    this.secretKey = this.configService.get<string>('IYZICO_SECRET_KEY');
    this.baseUrl =
      this.configService.get<string>('IYZICO_BASE_URL') ??
      'https://sandbox-api.iyzipay.com';
  }

  async initializeCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const checkoutToken = `iyzico:${input.paymentId}`;
    return {
      checkoutToken,
      checkoutUrl: `${this.baseUrl}/checkoutform/${encodeURIComponent(checkoutToken)}`,
    };
  }

  async retrieveCheckout(token: string): Promise<RetrievedPaymentResult> {
    return {
      providerPaymentId: token,
      checkoutToken: token,
      status: 'success',
    };
  }

  async refundPayment(providerPaymentId: string, _amount: number): Promise<RefundResult> {
    return { providerRefundId: `refund:${providerPaymentId}` };
  }

  async cancelPayment(providerPaymentId: string): Promise<RefundResult> {
    return { providerRefundId: `cancel:${providerPaymentId}` };
  }

  assertSignatureV3(payload: unknown, signature?: string): boolean {
    if (!this.secretKey || !signature) {
      return false;
    }

    const expected = createHmac('sha256', this.secretKey)
      .update(this.stableStringify(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  }

  private stableStringify(payload: unknown): string {
    if (payload === null || typeof payload !== 'object') {
      return String(payload);
    }

    return JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort());
  }
}
