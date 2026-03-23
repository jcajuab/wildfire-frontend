"use client";

import { useEffect, useRef, useState } from "react";
import { WildfireLogo } from "@/components/common/wildfire-logo";

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

const LOGO_WIDTH = 200;
const LOGO_HEIGHT = 80;
const SPEED = 2;

interface Position {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function BouncingLogoScreensaver() {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Position | null>(null);
  const animationRef = useRef<number | null>(null);
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxX = container.clientWidth - LOGO_WIDTH;
    const maxY = container.clientHeight - LOGO_HEIGHT;

    positionRef.current = {
      x: Math.random() * Math.max(0, maxX),
      y: Math.random() * Math.max(0, maxY),
      dx: Math.random() > 0.5 ? SPEED : -SPEED,
      dy: Math.random() > 0.5 ? SPEED : -SPEED,
    };

    if (logoRef.current && positionRef.current) {
      logoRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`;
    }

    const animate = () => {
      const pos = positionRef.current;
      if (!pos) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentMaxX = container.clientWidth - LOGO_WIDTH;
      const currentMaxY = container.clientHeight - LOGO_HEIGHT;

      let nextX = pos.x + pos.dx;
      let nextY = pos.y + pos.dy;
      let bounced = false;

      if (nextX <= 0 || nextX >= currentMaxX) {
        pos.dx = -pos.dx;
        nextX = Math.max(0, Math.min(nextX, currentMaxX));
        bounced = true;
      }

      if (nextY <= 0 || nextY >= currentMaxY) {
        pos.dy = -pos.dy;
        nextY = Math.max(0, Math.min(nextY, currentMaxY));
        bounced = true;
      }

      pos.x = nextX;
      pos.y = nextY;

      if (logoRef.current) {
        logoRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`;
      }

      if (bounced) {
        setColorIndex((prev) => (prev + 1) % COLORS.length);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      const pos = positionRef.current;
      if (!pos) return;

      const resizeMaxX = container.clientWidth - LOGO_WIDTH;
      const resizeMaxY = container.clientHeight - LOGO_HEIGHT;
      pos.x = Math.min(pos.x, Math.max(0, resizeMaxX));
      pos.y = Math.min(pos.y, Math.max(0, resizeMaxY));
      if (logoRef.current) {
        logoRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const currentColor = COLORS[colorIndex];

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-black"
      aria-hidden="true"
    >
      <div
        ref={logoRef}
        className="absolute flex items-center justify-center transition-colors duration-300"
        style={{
          width: LOGO_WIDTH,
          height: LOGO_HEIGHT,
          color: currentColor,
        }}
      >
        <WildfireLogo className="h-full w-full" />
      </div>
    </div>
  );
}
