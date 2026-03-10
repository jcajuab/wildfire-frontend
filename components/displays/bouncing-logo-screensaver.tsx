"use client";

import { useEffect, useRef, useState } from "react";

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
  const positionRef = useRef<Position | null>(null);
  const animationRef = useRef<number | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

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
    setPosition({ x: positionRef.current.x, y: positionRef.current.y });

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

      if (bounced) {
        setColorIndex((prev) => (prev + 1) % COLORS.length);
      }

      setPosition({ x: nextX, y: nextY });
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
      setPosition({ x: pos.x, y: pos.y });
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
      className="h-screen w-screen bg-black"
      aria-hidden="true"
    >
      <div
        className="absolute flex items-center justify-center transition-colors duration-300"
        style={{
          width: LOGO_WIDTH,
          height: LOGO_HEIGHT,
          transform: `translate(${position.x}px, ${position.y}px)`,
          color: currentColor,
        }}
      >
        <svg
          viewBox="0 0 200 80"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 60C40 60 25 45 25 35C25 25 32 20 40 20C48 20 55 25 55 35C55 45 40 60 40 60Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M40 55C40 55 30 43 30 36C30 29 35 26 40 26C45 26 50 29 50 36C50 43 40 55 40 55Z"
            fill="currentColor"
            opacity="0.6"
          />
          <path
            d="M40 48C40 48 35 41 35 37C35 33 37 31 40 31C43 31 45 33 45 37C45 41 40 48 40 48Z"
            fill="currentColor"
            opacity="0.3"
          />
          <text
            x="70"
            y="48"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="24"
            fontWeight="bold"
            fill="currentColor"
            letterSpacing="0.05em"
          >
            WILDFIRE
          </text>
        </svg>
      </div>
    </div>
  );
}
