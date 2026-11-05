"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const SPEED = 330; // pixels the trail moves left per SECOND (the look from the 165Hz screen)
const RADII = [6, 6]; // size of each dot (and how thick its smear starts)
// each dot waves at its own speed, so they drift in and out of sync instead of mirroring each other
const RHYTHMS = [1, 0.71];
const OFFSETS = [0, 1.3]; // and starts at a different point in its wave

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
      const pos = { x: -RADII[0] };
      // past heights of each dot (-1 to 1), newest first. The trail is drawn from these.
      const histories: { y: number; dx: number }[][] = [[], []];
      // ink drops flicked off the trails; they drift left with the trail and dry up
      let drops: { x: number; y: number; r: number; life: number }[] = [];
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
        const step = SPEED * (avgDelta / 1000); // pixels moved this frame
        const frames = avgDelta / (1000 / 60); // this frame's length compared with a 60Hz frame (165Hz ≈ 0.36)
        const x = pos.x;
        const a = wave.amplitude;
        ctx.clearRect(0, 0, w, h);

        // How thick the leftover solid line is (half of its 2px height). It grows in during the
        // outro, and the smear never gets thinner than it, so the smear melts into the line.
        const floor = line.opacity;

        histories.forEach((history, d) => {
          const R = RADII[d];
          const dir = d === 0 ? 1 : -1; // the second dot starts on the opposite side
          // each point remembers its height AND how far the trail moved that frame,
          // so a slow frame makes a longer gap instead of a lump
          history.unshift({
            y: dir * Math.sin(phase * RHYTHMS[d] + OFFSETS[d]),
            dx: step,
          });
          // keep only as much trail as fits between the left edge and the dot
          let total = 0;
          let keep = 0;
          while (keep < history.length && total < x)
            total += history[keep++].dx;
          history.length = Math.min(history.length, Math.max(2, keep));

          // the centre line of the trail, front (at the dot) to back
          const pts: { x: number; y: number }[] = [];
          let cx = x;
          for (const p of history) {
            pts.push({ x: cx, y: h / 2 + p.y * a });
            cx -= p.dx;
          }
          const len = Math.max(1, x - pts[pts.length - 1].x); // how long the trail is in pixels
          const yAt = (i: number) => pts[i].y;

          // thickness at point i: pow(..., 1.6) thins it out quickly behind the dot.
          // No wobble any more, that was what made the edge look bumpy.
          const thickness = (i: number) =>
            Math.max(floor, R * Math.pow(1 - (x - pts[i].x) / len, 1.6));

          // Push each point out sideways (along the curve's normal, not straight up/down),
          // so the ribbon stays the same thickness even where the wave is steep.
          const top: { x: number; y: number }[] = [];
          const bottom: { x: number; y: number }[] = [];
          pts.forEach((pt, i) => {
            const a2 = pts[Math.max(0, i - 1)];
            const b2 = pts[Math.min(pts.length - 1, i + 1)];
            const tx = b2.x - a2.x;
            const ty = b2.y - a2.y;
            const l = Math.hypot(tx, ty) || 1;
            const nx = -ty / l;
            const ny = tx / l;
            const t = thickness(i);
            top.push({ x: pt.x + nx * t, y: pt.y + ny * t });
            bottom.push({ x: pt.x - nx * t, y: pt.y - ny * t });
          });

          // Draw a smooth curve through the points (curving through the midpoints
          // instead of joining them with straight lines, so there are no corners).
          const smooth = (list: { x: number; y: number }[], first: boolean) => {
            if (first) ctx.moveTo(list[0].x, list[0].y);
            else ctx.lineTo(list[0].x, list[0].y);
            for (let i = 1; i < list.length - 1; i++) {
              const mx = (list[i].x + list[i + 1].x) / 2;
              const my = (list[i].y + list[i + 1].y) / 2;
              ctx.quadraticCurveTo(list[i].x, list[i].y, mx, my);
            }
            const last = list[list.length - 1];
            ctx.lineTo(last.x, last.y);
          };

          // The smear fades toward the left, but only down to the line's brightness,
          // so in the outro it ends exactly as bright as the line it turns into.
          const fade = ctx.createLinearGradient(x, 0, x - len, 0);
          fade.addColorStop(0, "rgba(255,255,255,1)");
          fade.addColorStop(
            0.6,
            `rgba(255,255,255,${0.5 + 0.5 * line.opacity})`,
          );
          fade.addColorStop(1, `rgba(255,255,255,${line.opacity})`);
          ctx.fillStyle = fade;
          ctx.beginPath();
          smooth(top, true); // top edge, front to back
          smooth(bottom.reverse(), false); // bottom edge, back to front
          ctx.closePath();
          ctx.fill();

          // Solid line from the left edge up to where the smear ends (no overlap, so no double-bright bit).
          if (d === 0 && line.opacity > 0) {
            ctx.fillStyle = `rgba(255,255,255,${line.opacity})`;
            ctx.fillRect(0, h / 2 - 1, Math.max(0, x - len + 1), 2);
          }

          // Splatter: when the dot moves up or down fast, it flicks off a tiny ink drop.
          // speed in pixels per SECOND (not per frame), so a 165Hz screen splatters as much as a 60Hz one
          const speedY =
            Math.abs(pts[0].y - (pts[1] ?? pts[0]).y) / (avgDelta / 1000);
          if (speedY > 130 && Math.random() < 0.35 * frames) {
            drops.push({
              x: x - 10 - Math.random() * 30,
              y: yAt(0) + (Math.random() - 0.5) * 30,
              r: 0.8 + Math.random() * 1.6,
              life: 1,
            });
          }

          // The dot itself.
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(x, yAt(0), R, 0, Math.PI * 2);
          ctx.fill();

          // Percentage label that rides along with the big dot.
          if (d === 0) {
            ctx.font = "12px sans-serif";
            ctx.fillStyle = `rgba(255,255,255,${label.opacity})`;
            ctx.fillText(
              `${Math.round(progress.value)}%`,
              x + R + 6,
              yAt(0) - R,
            );
          }
        });

        // Drops drift left with the trail, shrink and fade as they dry.
        drops = drops.filter((p) => (p.life -= 0.012 * frames) > 0);
        drops.forEach((p) => {
          p.x -= step;
          ctx.fillStyle = `rgba(255,255,255,${p.life})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (0.5 + 0.5 * p.life), 0, Math.PI * 2);
          ctx.fill();
        });
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
          yPercent: -120,
          duration: 1,
          delay: 0.1,
          ease: "power4.inOut",
        }) // 5.1 – 6.1s split open
        .to(
          ".bottom",
          { yPercent: 120, duration: 1, ease: "power4.inOut" },
          "<",
        )
        .to(".edge-glow", { opacity: 0.4, duration: 0.3 }, "<")
        .call(() => window.dispatchEvent(new Event("loader-done")), [], "<") // tell the nav line to draw in
        .to(canvas, { opacity: 0, duration: 0.3 }, "<");

      return () => gsap.ticker.remove(draw);
    },
    { scope: container },
  );

  if (done) return null;

  return (
    <div ref={container} className="fixed inset-0 z-50">
      <div className="top absolute inset-x-0 top-0 h-1/2 bg-black">
        <div className="edge-glow absolute inset-x-0 bottom-0 opacity-0" />
      </div>
      <div className="bottom absolute inset-x-0 bottom-0 h-1/2 bg-black">
        <div className="edge-glow absolute inset-x-0 top-0 opacity-0" />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
