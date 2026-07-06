// Müzayede etkinliği yaşam durumu — rozet, sıralama ve bölümler için tek
// doğruluk kaynağı (ana sayfa + müzayedeler sekmesi aynı mantığı kullanır).
export type EventLifeStatus = 'live' | 'upcoming' | 'ended';

interface EventLike {
  status: string;
  startTime: string;
  endTime: string;
}

export function getEventLifeStatus(item: EventLike, now: number): EventLifeStatus {
  const endMs = new Date(item.endTime).getTime();
  if (
    item.status === 'ENDED' ||
    item.status === 'COMPLETED' ||
    item.status === 'CANCELLED' ||
    endMs <= now
  ) {
    return 'ended';
  }
  if (item.status === 'ACTIVE') return 'live';
  return 'upcoming';
}

// "58 dk sonra" / "3s 20dk sonra" / uzaksa kısa tarih.
export function formatStartsIn(
  startMs: number,
  now: number,
  locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const diff = startMs - now;
  if (diff <= 0) return t('auctions.startingSoon', { defaultValue: 'Başlamak üzere' });
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('auctions.startsInMinutes', { defaultValue: `${mins} dk sonra`, count: mins });
  if (mins < 24 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return t('auctions.startsInHours', { defaultValue: `${h}s ${m}dk sonra`, h, m });
  }
  return new Date(startMs).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
