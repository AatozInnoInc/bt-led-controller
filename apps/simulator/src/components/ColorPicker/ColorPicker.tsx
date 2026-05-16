import { useCallback, useEffect, useRef, useState } from 'react';
import type { RGB } from '@bt-led/led-types';
import { useColorWheelSize } from '../../hooks/useColorWheelSize';
import { hexToRgb, hsvToRgb, pointToHueSat, rgbToHex, rgbToHsv } from './colorMath';

interface Props {
  color: RGB;
  disabled?: boolean;
  disabledHint?: string;
  showSecondary?: boolean;
  secondaryColor?: RGB;
  onChange(color: RGB): void;
  onSecondaryChange?: (color: RGB) => void;
}

// Draws hue arcs around the wheel, then a radial white→transparent overlay for
// saturation, then a thin dark vignette ring per the UI spec.
function paintWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const cx = w / 2;
  const cy = w / 2;
  const r = w / 2 - 1;

  ctx.clearRect(0, 0, w, w);
  for (let h = 0; h < 360; h++) {
    const start = ((h - 1) * Math.PI) / 180;
    const end = ((h + 1) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    const { r: cr, g: cg, b: cb } = hsvToRgb(h, 1, 1);
    ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
    ctx.fill();
  }

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
  ctx.stroke();
}

// A single colour picker section (wheel + sliders + hex).
function ColorSection({
  label,
  color,
  disabled,
  wheelSize,
  onChange,
}: {
  label?: string;
  color: RGB;
  disabled?: boolean;
  wheelSize: number;
  onChange(c: RGB): void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const [hexInput, setHexInput] = useState(() => rgbToHex(color));

  useEffect(() => { setHexInput(rgbToHex(color)); }, [color]);

  const currentHSV = rgbToHsv(color.r, color.g, color.b);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const radius = wheelSize / 2 - 1;
  const cursorX = wheelSize / 2 + Math.cos((currentHSV.h * Math.PI) / 180) * currentHSV.s * radius;
  const cursorY = wheelSize / 2 + Math.sin((currentHSV.h * Math.PI) / 180) * currentHSV.s * radius;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const buf = Math.round(wheelSize * dpr);
    canvas.width = buf;
    canvas.height = buf;
    paintWheel(canvas);
  }, [wheelSize, dpr]);

  const pickFromEvent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * wheelSize - wheelSize / 2;
    const y = ((clientY - rect.top) / rect.height) * wheelSize - wheelSize / 2;
    const { h, s } = pointToHueSat(x, y, radius);
    onChange(hsvToRgb(h, s, currentHSV.v || 1));
  }, [currentHSV.v, onChange, radius, wheelSize]);

  const cursorDiameter = Math.round(Math.max(16, wheelSize * 0.21));
  const ringW = Math.max(2.5, cursorDiameter * 0.12);
  const ringOuter = ringW + 1.25;
  const cursorStyle = {
    left: `${cursorX}px`,
    top: `${cursorY}px`,
    width: `${cursorDiameter}px`,
    height: `${cursorDiameter}px`,
    boxShadow: `0 0 0 ${ringW}px #fff, 0 0 0 ${ringOuter}px rgba(0, 0, 0, 0.58)`,
  } as const;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled)
      return;
    if (e.pointerType === 'touch')
      e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    pickFromEvent(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current)
      return;
    if (e.pointerType === 'touch')
      e.preventDefault();
    pickFromEvent(e.clientX, e.clientY);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onChannel = (key: keyof RGB) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...color, [key]: Number(e.target.value) });

  const onHexCommit = () => {
    const rgb = hexToRgb(hexInput);
    if (rgb) onChange(rgb);
    else setHexInput(rgbToHex(color));
  };

  return (
    <div className="color-section">
      {label && <span className="color-section-label panel-label">{label}</span>}
      <div className="color-wheel-wrap">
        <canvas
          ref={canvasRef}
          width={Math.round(wheelSize * dpr)}
          height={Math.round(wheelSize * dpr)}
          style={{ width: wheelSize, height: wheelSize, touchAction: 'none' }}
          className="color-wheel"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <span className="color-cursor" style={cursorStyle} aria-hidden />
      </div>

      <div className="rgb-sliders">
        {(['r', 'g', 'b'] as const).map((ch) => (
          <label key={ch} className="rgb-row">
            <span className="rgb-label">{ch.toUpperCase()}</span>
            <input
              type="range"
              min={0}
              max={255}
              value={color[ch]}
              onChange={onChannel(ch)}
              disabled={disabled}
              aria-label={`${ch.toUpperCase()} channel`}
            />
            <span className="rgb-value">{color[ch]}</span>
          </label>
        ))}
      </div>

      <label className="hex-row">
        <span className="hex-label">Hex</span>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={onHexCommit}
          onKeyDown={(e) => e.key === 'Enter' && onHexCommit()}
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          className="hex-input"
        />
      </label>
    </div>
  );
}

export function ColorPicker({
  color,
  disabled,
  disabledHint,
  showSecondary,
  secondaryColor,
  onChange,
  onSecondaryChange,
}: Props) {
  const wheelSize = useColorWheelSize();

  // Placeholder shown in the Color B wheel before the user picks a value.
  const colorB = secondaryColor ?? { r: 0, g: 0, b: 255 };

  return (
    <section
      id="color-col"
      className={`color-col${disabled ? ' is-disabled' : ''}`}
      aria-disabled={disabled}
    >
      <header className="panel-header">
        <span className="panel-label">{showSecondary ? 'Color A' : 'Color'}</span>
        {disabled && disabledHint ? <span className="panel-note">— {disabledHint}</span> : null}
      </header>

      <ColorSection color={color} disabled={disabled} wheelSize={wheelSize} onChange={onChange} />

      {showSecondary && onSecondaryChange && (
        <>
          <div className="color-section-divider" />
          <header className="panel-header">
            <span className="panel-label">Color B</span>
            {!secondaryColor && (
              <span className="panel-note">— move wheel or sliders to activate</span>
            )}
          </header>
          <ColorSection
            color={colorB}
            disabled={disabled}
            wheelSize={wheelSize}
            onChange={onSecondaryChange}
          />
        </>
      )}
    </section>
  );
}
