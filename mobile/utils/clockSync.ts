let clientServerOffset = 0;

/**
 * Updates the global client-server clock offset.
 * @param serverTime - ISO string or Date or timestamp received from the server.
 */
export function updateClockOffset(serverTime: string | Date | number | undefined | null): void {
  if (!serverTime) return;
  const serverMs = new Date(serverTime).getTime();
  if (isNaN(serverMs)) return;
  clientServerOffset = serverMs - Date.now();
}

/**
 * Returns the current time synchronized with the server's clock.
 */
export function getSynchronizedTime(): number {
  return Date.now() + clientServerOffset;
}

/**
 * Returns the current clock offset in milliseconds.
 */
export function getClockOffset(): number {
  return clientServerOffset;
}
