"use client";

import * as React from "react";
import { animate, motion, useMotionTemplate, useMotionValue } from "framer-motion";

// ─── Aurora color palette ─────────────────────────────────────────────────────
const AURORA_COLORS = [
  "#bfdbfe", // blue-200
  "#93c5fd", // blue-300
  "#a5b4fc", // indigo-300
  "#7dd3fc", // sky-300
  "#c4b5fd", // violet-300
  "#dbeafe", // blue-100
];

// ─── Animated stripe heights ──────────────────────────────────────────────────
const STRIPES = [
  55, 80, 65, 100, 120, 140, 110, 90, 75, 130, 95, 115,
  70, 150, 85, 125, 60, 135, 105, 145, 80, 120, 95, 160,
  75, 110, 65, 140,
];

// ─── StarField ────────────────────────────────────────────────────────────────
function StarField() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 0.0003 + 0.0001,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        const twinkle = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 1000 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${twinkle})`;
        ctx.fill();
      });
      t += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

// ─── AnimatedStripes ──────────────────────────────────────────────────────────
function AnimatedStripes() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 flex h-[200px] items-end justify-center gap-[5px] overflow-hidden px-4"
      aria-hidden="true"
    >
      {STRIPES.map((h, i) => (
        <motion.div
          key={i}
          className="shrink-0 rounded-t"
          style={{
            width: 14,
            background: `linear-gradient(to top, rgba(${
              i % 3 === 0
                ? "59,130,246"
                : i % 3 === 1
                ? "99,102,241"
                : "14,165,233"
            },0.${12 + (i % 9)}), rgba(219,234,254,0))`,
          }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: h, opacity: 1 }}
          transition={{
            duration: 1.2,
            delay: i * 0.04,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

// ─── AuroraBackground (default export — use this anywhere) ───────────────────
interface AuroraBackgroundProps {
  children: React.ReactNode;
  /** Extra Tailwind classes on the outer section (e.g. min-h-screen, pt-24) */
  className?: string;
  /** Show the animated stripe bars at the bottom. Default: true */
  showStripes?: boolean;
  /** Show the white fade-out at the very bottom. Default: true */
  showFade?: boolean;
}

export default function AuroraBackground({
  children,
  className = "min-h-screen",
  showStripes = true,
  showFade = true,
}: AuroraBackgroundProps) {
  const color = useMotionValue(AURORA_COLORS[0]);

  React.useEffect(() => {
    const controls = animate(color, AURORA_COLORS, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
    return controls.stop;
  }, [color]);

  const backgroundImage =
    useMotionTemplate`radial-gradient(130% 130% at 50% 0%, #ffffff 40%, ${color})`;

  return (
    <motion.section
      style={{ backgroundImage }}
      className={`relative overflow-hidden bg-white ${className}`}
    >
      {/* Faint twinkling stars */}
      <StarField />

      {/* Page content sits above the decorative layers */}
      <div className="relative z-10">{children}</div>

      {/* Rising bar stripes */}
      {showStripes && <AnimatedStripes />}

      {/* Soft white fade at the bottom so content below blends in */}
      {showFade && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-b from-transparent to-white"
          aria-hidden="true"
        />
      )}
    </motion.section>
  );
}