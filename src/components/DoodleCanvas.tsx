import React, { useRef, useState, useEffect } from 'react';
import type { DoodlePath, DoodlePoint } from '../types/photobooth';

interface DoodleCanvasProps {
  active: boolean;
  doodles: DoodlePath[];
  onAddDoodle: (doodle: DoodlePath) => void;
  currentColor: string;
  currentSize: number;
  glowEnabled: boolean;
  width: number;
  height: number;
}

export const DoodleCanvas: React.FC<DoodleCanvasProps> = ({
  active,
  doodles,
  onAddDoodle,
  currentColor,
  currentSize,
  glowEnabled,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<DoodlePoint[]>([]);

  // Render all existing doodles onto the interactive canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    for (const stroke of doodles) {
      if (!stroke.points || stroke.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.color;

      if (stroke.glow) {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.size * 1.6;
      }

      const first = stroke.points[0];
      ctx.moveTo((first.x / 100) * width, (first.y / 100) * height);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo((pt.x / 100) * width, (pt.y / 100) * height);
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [doodles, width, height]);

  const getCanvasCoords = (clientX: number, clientY: number): DoodlePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const xPixel = clientX - rect.left;
    const yPixel = clientY - rect.top;

    return {
      x: Math.max(0, Math.min(100, (xPixel / rect.width) * 100)),
      y: Math.max(0, Math.min(100, (yPixel / rect.height) * 100)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const pt = getCanvasCoords(e.clientX, e.clientY);
    if (pt) {
      currentPointsRef.current = [pt];
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || !isDrawing) return;

    const pt = getCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;

    currentPointsRef.current.push(pt);

    // Live draw the active stroke
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentPointsRef.current;
    if (pts.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = currentSize;
    ctx.strokeStyle = currentColor;

    if (glowEnabled) {
      ctx.shadowColor = currentColor;
      ctx.shadowBlur = currentSize * 1.6;
    }

    const prevPt = pts[pts.length - 2];
    const currPt = pts[pts.length - 1];

    ctx.moveTo((prevPt.x / 100) * width, (prevPt.y / 100) * height);
    ctx.lineTo((currPt.x / 100) * width, (currPt.y / 100) * height);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || !isDrawing) return;
    setIsDrawing(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (currentPointsRef.current.length > 1) {
      const newDoodle: DoodlePath = {
        id: `doodle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        points: [...currentPointsRef.current],
        color: currentColor,
        size: currentSize,
        glow: glowEnabled,
      };
      onAddDoodle(newDoodle);
    }
    currentPointsRef.current = [];
  };

  if (!active && doodles.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        touchAction: 'none',
      }}
      className={`absolute inset-0 z-30 ${active ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
    />
  );
};
