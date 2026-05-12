import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LedStrip } from './LedStrip';

describe('LedStrip', () => {
  it('renders one .led element per pixel with halo + core children', () => {
    const pixels = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 0, b: 0 },
    ];
    const { container } = render(<LedStrip pixels={pixels} />);

    const leds = container.querySelectorAll('.led');
    expect(leds).toHaveLength(2);
    expect(container.querySelectorAll('.led-halo')).toHaveLength(2);
    expect(container.querySelectorAll('.led-core')).toHaveLength(2);

    const halo = leds[0].querySelector('.led-halo') as HTMLElement;
    expect(halo.style.background).toBe('rgba(255, 0, 0, 0.22)');

    const dimCore = leds[1].querySelector('.led-core') as HTMLElement;
    expect(dimCore.style.background).toBe('rgba(255, 255, 255, 0.04)');
  });
});
