import { useCallback, useEffect, useRef } from 'react';

/**
 * Bir fonksiyonu debounce eder: art arda tetiklenirse yalnız son çağrıdan
 * `delayMs` sonra bir kez çalışır. Canlı müzayede socket olaylarında (her
 * teklifte REST refetch) istek fırtınasını önlemek için kullanılır — hızlı
 * peyler tek refetch'te toplanır.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
    },
    [delayMs],
  );
}
