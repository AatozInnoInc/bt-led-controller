import { useEffect, useState } from 'react';

export const COLOR_WHEEL_PX_FINE_POINTER = 72;
export const COLOR_WHEEL_PX_COARSE_POINTER = 120;

function readWheelPx(): number {
  if (typeof window === 'undefined')
    return COLOR_WHEEL_PX_FINE_POINTER;
  const mq = window.matchMedia('(pointer: coarse)');
  if (mq.matches)
    return COLOR_WHEEL_PX_COARSE_POINTER;
  return COLOR_WHEEL_PX_FINE_POINTER;
}

/**
 * Touch devices get a larger picker wheel for parity with enlarged range sliders (`index.css`).
 */
export function useColorWheelSize(): number {
  const [px, setPx] = useState(readWheelPx);

  useEffect(() => {
    if (typeof window === 'undefined')
      return;
    const mq = window.matchMedia('(pointer: coarse)');
    function onChange(): void {
      setPx(readWheelPx());
    }

    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return px;
}
