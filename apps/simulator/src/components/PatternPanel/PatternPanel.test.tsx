import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatternPanel } from './PatternPanel';

describe('PatternPanel', () => {
  it('marks the selected card and fires onPattern on click', () => {
    const onPattern = vi.fn();
    render(
      <PatternPanel pattern="rainbow" speed={50} onPattern={onPattern} onSpeed={() => {}} />,
    );

    const rainbow = screen.getByRole('radio', { name: /^Rainbow$/ });
    expect(rainbow).toHaveAttribute('aria-checked', 'true');
    expect(rainbow.className).toMatch(/is-selected/);

    const fire = screen.getByRole('radio', { name: /^Fire$/ });
    fireEvent.click(fire);
    expect(onPattern).toHaveBeenCalledWith('fire');
  });

  it('reports speed slider changes', () => {
    const onSpeed = vi.fn();
    render(
      <PatternPanel pattern="solid" speed={20} onPattern={() => {}} onSpeed={onSpeed} />,
    );
    const slider = screen.getByRole('slider', { name: /pattern speed/i });
    fireEvent.change(slider, { target: { value: '88' } });
    expect(onSpeed).toHaveBeenCalledWith(88);
  });
});
