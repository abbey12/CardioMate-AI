import React, { useEffect, useMemo, useRef } from "react";

export function Waveform(props: {
  samples: number[];
  rPeaks?: number[];
  width?: number;
  height?: number;
  title?: string;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const width = props.width ?? 980;
  const height = props.height ?? 220;

  const peaksInRange = useMemo(() => {
    const maxIdx = props.samples.length - 1;
    return (props.rPeaks ?? []).filter((p) => p >= 0 && p <= maxIdx);
  }, [props.rPeaks, props.samples.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // background
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, width, height);

    const xs = props.samples;
    if (xs.length < 2) return;

    // normalize to canvas coordinates
    let min = Infinity;
    let max = -Infinity;
    for (const x of xs) {
      if (x < min) min = x;
      if (x > max) max = x;
    }
    const range = Math.max(1e-9, max - min);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    // waveform
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const x = (i / (xs.length - 1)) * (width - 1);
      const y = height - 1 - ((xs[i] - min) / range) * (height - 1);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // r-peak markers
    if (peaksInRange.length > 0) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
      ctx.lineWidth = 1;
      for (const p of peaksInRange) {
        const x = (p / (xs.length - 1)) * (width - 1);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
    }
  }, [height, peaksInRange, props.samples, width]);

  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">{props.title ?? "Waveform"}</div>
          <div className="cardSubtle">
            {props.samples.length.toLocaleString()} samples shown
          </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "auto", borderRadius: 12 }}
      />
    </div>
  );
}


