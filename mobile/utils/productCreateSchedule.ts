export const AUCTION_START_DELAY_PRESETS = [1, 6, 24] as const;
export const AUCTION_DURATION_PRESETS = [12, 24, 48] as const;

export function buildAuctionSchedule(
  startDelayHours: number,
  durationHours: number,
  baseDate = new Date(),
) {
  const startTime = new Date(baseDate.getTime() + startDelayHours * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
}
