export enum BidStatus {
  ACTIVE = 'ACTIVE',
  OUTBID = 'OUTBID',
  WON = 'WON',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  /** Müzayede başlamadan verilen ön teklif; başlangıçta proxy olarak yarıştırılır. */
  ABSENTEE = 'ABSENTEE',
}
