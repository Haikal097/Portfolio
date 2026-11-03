"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// `at` is where each marker sits along the line, from 0 (left) to 1 (right).
const sections = [
  { label: "Work", id: "work", at: 0.3 },
  { label: "About", id: "about", at: 0.55 },
  { label: "Contact", id: "contact", at: 0.8 },
];

const HEIGHT = 40; // canvas height, so the wave has room to wiggle
const MAX_WIGGLE = 8; // tallest the wave gets while the dot travels (px)

// The loader's line, carried up to the top of the page.
// The dot glides along the line and lands on the marker of the section you're in,
// wiggling like the loader's wave while it travels.
export default function NavLine() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      let w = 0;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        w = canvas.offsetWidth;
        canvas.width = w * dpr;
        canvas.height = HEIGHT * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener("resize", resize);

      const state = { reveal: 0, progress: 0, wiggle: 0 };
      let phase = 0;
      let lastProgress = 0;
      let current = ""; // id of the section the dot is resting on

      // Find the section in the middle of the screen, light up its label,
      // and send the dot gliding to its marker. Above the first section, the dot goes home (left).
      const update = () => {
        const middle = window.scrollY + window.innerHeight / 2;
        const active = sections.find(({ id }) => {
          const el = document.getElementById(id);
          return (
            !!el &&
            middle >= el.offsetTop &&
            middle < el.offsetTop + el.offsetHeight
          );
        });
        const id = active?.id ?? "";
        if (id === current) return;
        current = id;
        sections.forEach((s) =>
          root
            .current!.querySelector(`[data-tick="${s.id}"]`)
            ?.classList.toggle("is-active", s.id === id),
        );
        gsap.to(state, {
          progress: active?.at ?? 0,
          duration: 1.2,
          ease: "power3.inOut",
          overwrite: "auto",
        });
      };
      update();
      ScrollTrigger.create({ start: 0, end: "max", onUpdate: update });

      const draw = () => {
        phase += 0.15;
        // The faster the dot moves, the more the line wiggles; it calms down once the dot lands.
        const speed = Math.abs(state.progress - lastProgress) * w;
        lastProgress = state.progress;
        state.wiggle = Math.min(MAX_WIGGLE, state.wiggle * 0.92 + speed * 0.3);
        const mid = HEIGHT / 2;
        const drawnTo = w * state.reveal; // how much of the line has drawn in
        const dotX = Math.max(4, w * state.progress); // keep the whole dot on the canvas at home

        ctx.clearRect(0, 0, w, HEIGHT);
        ctx.lineWidth = 1;

        // The line, bending into a wave near the dot when scrolling fast.
        const yAt = (x: number) => {
          const nearDot = Math.exp(-((x - dotX) ** 2) / (2 * 120 ** 2)); // 1 at the dot, fading out
          return mid + Math.sin(x * 0.05 - phase) * state.wiggle * nearDot;
        };
        for (const [from, to, alpha] of [
          [0, Math.min(dotX, drawnTo), 0.9], // already scrolled past: bright
          [dotX, drawnTo, 0.25], // still ahead: faint
        ]) {
          if (to <= from) continue;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          for (let x = from; x <= to; x += 2) ctx.lineTo(x, yAt(x));
          ctx.stroke();
        }

        // The dot.
        if (state.reveal > 0) {
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(dotX, yAt(dotX), 4, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      gsap.ticker.add(draw);

      // When the loader opens, draw the line in from the left and fade the labels in.
      const intro = () => {
        gsap.to(state, { reveal: 1, duration: 1.2, ease: "power3.inOut" });
        gsap.to(root.current!.querySelectorAll(".nav-label"), {
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          delay: 0.6,
        });
      };
      window.addEventListener("loader-done", intro, { once: true });

      return () => {
        gsap.ticker.remove(draw);
        window.removeEventListener("resize", resize);
        window.removeEventListener("loader-done", intro);
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-x-6 top-2 z-40 md:inset-x-10"
    >
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ height: HEIGHT }}
      />
      <a
        href="#"
        className="nav-label pointer-events-auto absolute top-9 left-0 font-display text-lg opacity-0"
      >
        Afiq
      </a>
      {sections.map(({ label, id, at }) => (
        <a
          key={id}
          href={`#${id}`}
          data-tick={id}
          className="nav-label nav-tick group pointer-events-auto absolute top-0 -translate-x-1/2 px-3 opacity-0"
          style={{ left: `${at * 100}%` }}
        >
          <span className="mx-auto mt-[17px] block h-1.5 w-px bg-white/50 group-hover:bg-white" />
          <span className="mt-2 block text-[10px] tracking-[0.2em] whitespace-nowrap text-white/40 uppercase transition-colors group-hover:text-white">
            {label}
          </span>
        </a>
      ))}
    </div>
  );
}
