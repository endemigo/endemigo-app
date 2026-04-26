export interface CheckoutInput {
  paymentId: string;
  buyerId: string;
  amount: number;
  currency: string;
  callbackUrl?: string;
}

export interface CheckoutResult {
  checkoutToken: string;
  checkoutUrl: string;
  providerPaymentId?: string;
}

export interface RetrievedPaymentResult {
  providerPaymentId: string;
  checkoutToken?: string;
  status: 'success' | 'failure' | 'pending';
  amount?: number;
}

export interface RefundResult {
  providerRefundId: string;
}

export interface PaymentProviderPort {
  initializeCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  retrieveCheckout(token: string): Promise<RetrievedPaymentResult>;
  refundPayment(providerPaymentId: string, amount: number): Promise<RefundResult>;
  cancelPayment(providerPaymentId: string): Promise<RefundResult>;
  assertSignatureV3(payload: unknown, signature?: string): boolean;
}
