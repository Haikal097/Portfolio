"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const SPEED = 2; // pixels the trail moves left each frame
const RADIUS = 10;

export default function Loader() {
  const container = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const pos = { x: -RADIUS };
      const history: number[] = []; // past sine values, newest first
      const wave = { amplitude: 60 }; // GSAP shrinks this to 0
      const line = { opacity: 0 }; // solid line left behind when the dot shoots off
      const progress = { value: 0 }; // GSAP counts this from 0 to 100
      const label = { opacity: 1 };
      let phase = 0; // where we are in the sine wave
      let avgDelta = 1000 / 60; // smoothed frame time in ms

      const draw = (_time: number, deltaTime: number) => {
        // Smooth out the frame time so one slow frame can't make the wave jump.
        avgDelta = avgDelta * 0.9 + Math.min(deltaTime, 50) * 0.1;
        phase += (avgDelta / 1000) * 4;
        const s = Math.sin(phase);
        history.unshift(s);
        if (history.length > w / SPEED) history.pop();

        const x = pos.x;
        const a = wave.amplitude;
        ctx.clearRect(0, 0, w, h);

        // Solid line from the left edge to the dot, faded in during the outro.
        ctx.fillStyle = `rgba(255,255,255,${line.opacity})`;
        ctx.fillRect(0, h / 2 - 1, Math.min(x, w), 2);

        // One circle follows the sine wave, the other is its mirror image.
        for (const dir of [1, -1]) {
          for (let i = 1; i < history.length; i++) {
            ctx.strokeStyle = `rgba(255,255,255,${1 - i / history.length})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - (i - 1) * SPEED, h / 2 + dir * history[i - 1] * a);
            ctx.lineTo(x - i * SPEED, h / 2 + dir * history[i] * a);
            ctx.stroke();
          }
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(x, h / 2 + dir * s * a, RADIUS, 0, Math.PI * 2);
          ctx.fill();
          // Percentage label that rides along with the first circle.
          if (dir === 1) {
            ctx.font = "12px sans-serif";
            ctx.fillStyle = `rgba(255,255,255,${label.opacity})`;
            ctx.fillText(
              `${Math.round(progress.value)}%`,
              x + RADIUS + 6,
              h / 2 + s * a - RADIUS,
            );
          }
        }
      };

      gsap.ticker.add(draw);

      gsap
        .timeline({ onComplete: () => setDone(true) })
        .to(pos, { x: w * 0.28, duration: 5, ease: "power2.out" }) // 0 – 5s glide in
        .fromTo(
          canvas,
          { opacity: 0 },
          { opacity: 1, duration: 2, ease: "power1.out" },
          0,
        ) // 0 – 2s fade in
        .to(progress, { value: 100, duration: 5, ease: "power1.inOut" }, 0) // 0 – 5s count up
        .to(label, { opacity: 0, duration: 0.3 }, 6) // hold 100% for 1s, then fade
        .to(wave, { amplitude: 0, duration: 3, ease: "sine.inOut" }, "-=2") // 3 – 6s smooth close
        .to(pos, { x: w + w / 2, duration: 1, delay: 0.2, ease: "power4.in" }) // 4.3 – 5s   shoot off
        .to(line, { opacity: 1, duration: 0.4, ease: "power2.in" }, "<")
        .to(".top", {
          yPercent: -100,
          duration: 1,
          delay: 0.1,
          ease: "power4.inOut",
        }) // 5.1 – 6.1s split open
        .to(
          ".bottom",
          { yPercent: 100, duration: 1, ease: "power4.inOut" },
          "<",
        )
        .to(canvas, { opacity: 0, duration: 0.3 }, "<");

      return () => gsap.ticker.remove(draw);
    },
    { scope: container },
  );

  if (done) return null;

  return (
    <div ref={container} className="fixed inset-0 z-50">
      <div className="top absolute inset-x-0 top-0 h-1/2 bg-black" />
      <div className="bottom absolute inset-x-0 bottom-0 h-1/2 bg-black" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
