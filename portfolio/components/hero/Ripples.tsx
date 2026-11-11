"use client";

import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// Ripple rings around the moon, in the moon's units (the moon's radius is 245).
// The first ring sits 35 outside the moon, then one every 70. Every other ring is dotted.
const rings = Array.from({ length: 11 }, (_, i) => ({
  r: 280 + i * 70,
  dash: i % 2 ? [3, 9] : [16, 12],
  opacity: Math.max(0.06, 0.6 - i * 0.055),
}));

// Little dots travelling around some rings
const dots = [
  { r: 350, size: 4 },
  { r: 490, size: 3 },
  { r: 280, size: 4 },
].map((dot) => ({
  ...dot,
  // travel the same way as the ring the dot sits on (odd rings turn the other way)
  dir: ((dot.r - 280) / 70) % 2 ? -1 : 1,
}));

const random = gsap.utils.random;

// All the rings are drawn on ONE canvas, like the loader and the nav line.
// Redrawing a few circles on a canvas is cheap, while spinning a big SVG made the
// browser repaint the whole picture every frame, which caused the lag.
export default function Ripples({
  moonBox,
}: {
  moonBox: RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP((context, contextSafe) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Where the moon's centre is on the canvas, and how big one "moon unit" is in pixels
    let cx = 0,
      cy = 0,
      unit = 1,
      w = 0,
      h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const box = moonBox.current!.getBoundingClientRect();
      const area = canvas.getBoundingClientRect();
      cx = box.left - area.left + box.width / 2;
      cy = box.top - area.top + box.height / 2;
      unit = box.width / 490;
    };
    resize();
    window.addEventListener("resize", resize);

    // Values GSAP animates; draw() reads them every frame
    // Each ring and dot gets its own random speed, so nothing moves in lockstep.
    // turn = how far the ring has turned (in full turns), speed = turns per second
    const state = rings.map((_, i) => ({
      scale: 0.7,
      alpha: 0,
      glow: 0,
      turn: Math.random(),
      speed: (i % 2 ? -1 : 1) * random(1 / 200, 1 / 90),
    }));
    // angle in degrees, speed in degrees per second
    const dotState = dots.map((dot) => ({
      angle: random(0, 360),
      speed: dot.dir * random(4, 12),
    }));
    const dotsShown = { alpha: 0 };

    // Don't draw while the hero is scrolled out of view
    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => (visible = entry.isIntersecting),
    );
    observer.observe(canvas);

    const draw = (_time: number, deltaTime: number) => {
      if (!visible) return;
      const dt = still ? 0 : Math.min(deltaTime, 50) / 1000; // seconds since last frame
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;

      rings.forEach((ring, i) => {
        const s = state[i];
        s.turn += s.speed * dt;
        const radius = ring.r * unit * s.scale;
        ctx.globalAlpha = Math.min(1, ring.opacity * s.alpha + s.glow);
        ctx.setLineDash(ring.dash.map((d) => d * unit));
        // sliding the dashes along the circle looks exactly like the ring turning
        ctx.lineDashOffset = -s.turn * 2 * Math.PI * radius;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.setLineDash([]);
      ctx.fillStyle = "white";
      ctx.globalAlpha = dotsShown.alpha;
      dots.forEach((dot, i) => {
        const d = dotState[i];
        d.angle += d.speed * dt;
        const a = (d.angle * Math.PI) / 180;
        ctx.beginPath();
        ctx.arc(
          cx + dot.r * unit * Math.cos(a),
          cy + dot.r * unit * Math.sin(a),
          dot.size * unit,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    gsap.ticker.add(draw);

    // Every few seconds, ease a value towards a new random target, forever.
    // That's what makes the motion feel natural instead of copy-pasted.
    const wander = contextSafe!(
      (target: object, prop: string, min: number, max: number) => {
        gsap.to(target, {
          [prop]: random(min, max),
          duration: random(3, 8),
          ease: "sine.inOut",
          onComplete: () => wander(target, prop, min, max),
        });
      },
    );

    // A pulse of light travels through the rings, then waits a random 3-8s.
    // Sometimes it goes outward, sometimes inward.
    const pulse = contextSafe!(() => {
      gsap.to(state, {
        glow: random(0.2, 0.4),
        duration: 0.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 1,
        stagger: { each: 0.12, from: Math.random() < 0.7 ? "start" : "end" },
      });
      gsap.delayedCall(random(3, 8), pulse);
    });

    // When the loader opens: rings ripple out from the moon, then the dots appear.
    // After that the rings and dots keep drifting at their own changing speeds.
    const intro = contextSafe!((e?: Event) => {
      if ((e as CustomEvent | undefined)?.detail?.skip) {
        // The loader was skipped (Loader.tsx): its rings spread out to exactly where these are,
        // so these don't ripple out. They just fade in, already in place, as those rings arrive.
        gsap.set(state, { scale: 1 });
        gsap.to(state, {
          alpha: 1,
          duration: 0.5,
          ease: "sine.inOut",
          delay: 1.2,
        });
      } else {
        gsap.to(state, {
          alpha: 1,
          scale: 1,
          duration: 1.4,
          ease: "power3.out",
          stagger: 0.07,
          delay: 0.5,
        });
      }
      gsap.to(dotsShown, { alpha: 1, duration: 0.6, delay: 1.3 });
      if (still) return;
      state.forEach((s, i) => {
        const dir = i % 2 ? -1 : 1; // odd rings keep turning the other way
        const [lo, hi] = dir > 0 ? [1 / 250, 1 / 70] : [-1 / 70, -1 / 250];
        wander(s, "speed", lo, hi);
      });
      dotState.forEach((d, i) => {
        const [lo, hi] = dots[i].dir > 0 ? [2, 16] : [-16, -2];
        wander(d, "speed", lo, hi);
      });
      gsap.delayedCall(3, pulse);
    });
    window.addEventListener("loader-done", intro, { once: true });

    return () => {
      gsap.ticker.remove(draw);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("loader-done", intro);
    };
  });

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    />
  );
}
