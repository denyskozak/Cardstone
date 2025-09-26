import { useApplication } from '@pixi/react';
import { useEffect, useRef } from 'react';

/**
 * Lightweight hook for subscribing to Pixi's shared ticker without forcing
 * components to re-render every frame. The callback runs inside the ticker and
 * receives the delta time in milliseconds.
 */
export function useMiniTicker(
  callback: (deltaMS: number) => void,
  enabled = true
): void {
  const { app } = useApplication();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const ticker = app.ticker;
    if (!ticker) {
      return undefined;
    }
    const tick = () => {
      callbackRef.current(ticker.deltaMS);
    };
    ticker.add(tick);
    return () => {
      ticker.remove(tick);
    };
  }, [app, enabled]);
}

export default useMiniTicker;
