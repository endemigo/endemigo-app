import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createConfiguration,
  DefaultApi,
  Notification as OneSignalNotification,
} from '@onesignal/node-onesignal';
import { NotificationDeliveryStatus } from '@endemigo/shared';

export interface PushPayload {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  idempotencyKey: string;
  // Deep-link verisi: mobil, tıklamada bu alanlarla ilgili ekranı açar.
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface PushResult {
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
}

@Injectable()
export class OneSignalProvider {
  private readonly appId?: string;
  private readonly client?: DefaultApi;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('ONESIGNAL_APP_ID');
    const restApiKey = this.configService.get<string>('ONESIGNAL_REST_API_KEY');

    if (this.appId && restApiKey) {
      const configuration = createConfiguration({ restApiKey });
      this.client = new DefaultApi(configuration);
    }
  }

  async sendPush(payload: PushPayload): Promise<PushResult> {
    if (!this.appId || !this.client) {
      return { status: NotificationDeliveryStatus.NO_PUSH_SUBSCRIPTION };
    }

    const notification = new OneSignalNotification();
    notification.app_id = this.appId;
    notification.include_aliases = { external_id: [payload.userId] };
    notification.target_channel = 'push';
    notification.headings = {
      en: payload.title,
      tr: translateToTurkish(payload.title),
    };
    notification.contents = {
      en: payload.body,
      tr: translateToTurkish(payload.body),
    };
    notification.idempotency_key = payload.idempotencyKey;
    // Tıklamada mobilin yönlendirme yapabilmesi için entity bilgisi taşınır.
    if (payload.relatedEntityType && payload.relatedEntityId) {
      notification.data = {
        relatedEntityType: payload.relatedEntityType,
        relatedEntityId: payload.relatedEntityId,
      };
    }

    const response = await this.client.createNotification(notification);

    return {
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: response.id,
    };
  }
}

const TRANSLATIONS: Record<string, string> = {
  // Titles
  'Payment secured': 'Ödeme güvence altında',
  'New paid order': 'Yeni ödenmiş sipariş',
  'Shipment preparation started': 'Gönderim hazırlığı başladı',
  'Order is in transit': 'Sipariş yolda',
  'Order delivered': 'Sipariş teslim edildi',
  'Order completed': 'Sipariş tamamlandı',
  'Return request created': 'İade talebi oluşturuldu',
  'Return request approved': 'İade talebi onaylandı',
  'Return request rejected': 'İade talebi reddedildi',
  'Return shipment in transit': 'İade kargosu yolda',
  'Return shipment delivered': 'İade kargosu teslim edildi',
  'Refund pending': 'İade bekliyor',
  'Refund completed': 'İade tamamlandı',
  'Order status updated': 'Sipariş durumu güncellendi',

  'Cargo created': 'Kargo oluşturuldu',
  'Return cargo created': 'İade kargosu oluşturuldu',
  'Cargo is in transit': 'Kargo yolda',
  'Return cargo is in transit': 'İade kargosu yolda',
  'Cargo delivered': 'Kargo teslim edildi',
  'Return cargo delivered': 'İade kargosu teslim edildi',
  'Cargo cancelled': 'Kargo iptal edildi',
  'Return cargo cancelled': 'İade kargosu iptal edildi',
  'Cargo delivery failed': 'Kargo teslimatı başarısız',
  'Return cargo delivery failed': 'İade kargosu teslimatı başarısız',
  'Cargo updated': 'Kargo güncellendi',
  'Return cargo updated': 'İade kargosu güncellendi',

  'Payment confirmed': 'Ödeme onaylandı',
  Outbid: 'Teklifiniz geçildi',
  'Auction started': 'Müzayede başladı',
  'Auction won': 'Müzayede kazanıldı',
  'Payment reminder': 'Ödeme hatırlatıcısı',
  'Payout approved': 'Ödeme onaylandı',
  'Payout rejected': 'Ödeme reddedildi',
  'Ask Price order hook': 'Fiyat Sor sipariş eşlemesi',

  // Bodies
  'Your payment is secured and the seller can now prepare the order.':
    'Ödemeniz güvence altına alındı, satıcı siparişi hazırlamaya başlayabilir.',
  'A paid order is waiting for shipment preparation.':
    'Yeni bir ödenmiş sipariş sevkiyat hazırlığı bekliyor.',
  'Your order is being prepared for shipment.':
    'Siparişiniz sevkiyat için hazırlanıyor.',
  'The order is now marked as preparing shipment.':
    'Sipariş, sevkiyat hazırlığında olarak işaretlendi.',
  'Your order is now in transit.': 'Siparişiniz yolda.',
  'The shipment has been handed over to cargo.':
    'Gönderiniz kargoya teslim edildi.',
  'Your order was delivered. You can now confirm delivery.':
    'Siparişiniz teslim edildi. Teslimatı onaylayabilirsiniz.',
  'The shipment is marked as delivered.':
    'Gönderi teslim edildi olarak işaretlendi.',
  'The order is completed successfully.': 'Sipariş başarıyla tamamlandı.',
  'The order is completed and payout can proceed.':
    'Sipariş tamamlandı, satıcı ödemesi aktarılabilir.',
  'Your return request has been created.': 'İade talebiniz oluşturuldu.',
  'A buyer opened a return request for this order.':
    'Alıcı bu sipariş için iade talebi oluşturdu.',
  'Your return request was approved. Return shipment is now active.':
    'İade talebiniz onaylandı. İade kargosu aktif.',
  'The return request has been approved and shipment was created.':
    'İade talebi onaylandı ve kargo kaydı oluşturuldu.',
  'Your return request was rejected.': 'İade talebiniz reddedildi.',
  'The return request has been rejected.': 'İade talebi reddedildi.',
  'Your return cargo is currently in transit.': 'İade kargonuz yolda.',
  'The buyer return cargo is on the way.': 'Alıcının iade kargosu yolda.',
  'Your return shipment reached the seller.': 'İade kargonuz satıcıya ulaştı.',
  'The return shipment was delivered to you.':
    'İade kargosu tarafınıza teslim edildi.',
  'Refund processing has started for this order.':
    'Bu sipariş için iade/refund işlemi başlatıldı.',
  'Your refund was completed successfully.':
    'İade/refund işleminiz başarıyla tamamlandı.',
  'Refund for this order has been completed.':
    'Bu sipariş için iade/refund işlemi tamamlandı.',

  'The cargo record has been created.': 'Kargo kaydı oluşturuldu.',
  'The return cargo record has been created.':
    'İade kargosu kaydı oluşturuldu.',
  'The cargo is currently in transit.': 'Kargo yolda.',
  'The return cargo is currently in transit.': 'İade kargosu yolda.',
  'The cargo has been delivered.': 'Kargo teslim edildi.',
  'The return cargo has been delivered.': 'İade kargosu teslim edildi.',
  'The cargo has been cancelled.': 'Kargo iptal edildi.',
  'The return cargo has been cancelled.': 'İade kargosu iptal edildi.',
  'The cargo encountered a delivery failure.':
    'Kargo teslimatında sorun oluştu.',
  'The return cargo encountered a delivery failure.':
    'İade kargosu teslimatında sorun oluştu.',
  'The cargo status has been updated.': 'Kargo durumu güncellendi.',
  'The return cargo status has been updated.':
    'İade kargosu durumu güncellendi.',

  'An accepted Ask Price offer is ready for order processing.':
    'Kabul edilen Fiyat Sor teklifi sipariş işlemi için hazır.',
};

function translateToTurkish(text: string): string {
  return TRANSLATIONS[text] || text;
}
