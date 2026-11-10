"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// The page sections, in the order they appear. `id` must match the section's id in page.tsx.
const SECTIONS = [
  { label: "Projects", id: "projects" },
  { label: "About", id: "about" },
  { label: "Skills", id: "skills" },
  { label: "Experience", id: "experience" },
  { label: "Education", id: "education" },
  { label: "Awards", id: "awards" },
  { label: "Contact", id: "contact" },
];

// Spread the markers evenly between FIRST and LAST along the line (0 = left, 1 = right),
// so adding or removing a section re-spaces them automatically.
const FIRST = 0.22;
const LAST = 0.94;
const sections = SECTIONS.map((s, i) => ({
  ...s,
  at: FIRST + (i * (LAST - FIRST)) / (SECTIONS.length - 1),
}));

const HEIGHT = 40; // canvas height, so the wave has room to wiggle
const START = 104; // the line starts here (px), a small gap after the "q" of the signature
const DOT_R = 4; // the dot's normal size
const MAX_WIGGLE = 8; // tallest the wave gets while the dot travels (px)

// The loader's line, carried up to the top of the page, starting from the "Afiq" signature.
// The dot is ink: on the hero it sits inside the signature. Scroll down and the ink drains
// out of the name into the dot, which smears along the line to the marker of the section you're in.
export default function NavLine() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      let w = 0; // width of the nav line
      let edge = 0; // gap between the nav and the left edge of the screen

      // The canvas reaches out past the nav to the left edge of the screen, so the intro shot
      // can fly in from off-screen. x = 0 is still the start of the nav; the screen edge is x = -edge.
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.style.marginLeft = "0px";
        canvas.style.width = "100%";
        w = canvas.offsetWidth;
        edge = root.current!.getBoundingClientRect().left;
        canvas.style.marginLeft = `-${edge}px`;
        canvas.style.width = `${w + edge}px`;
        canvas.width = (w + edge) * dpr;
        canvas.height = HEIGHT * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, edge * dpr, 0); // shift everything right by `edge`
      };
      resize();
      window.addEventListener("resize", resize);

      // The dot is "ink". On the hero the ink sits inside the signature. Leaving the hero,
      // it gets yanked out through the tip of the "q" and smears along the line into the dot.
      // Coming back, it smears back into the name and fills it again.
      const inkAt = () => START / w; // the start of the line, as progress (0 to 1)
      // progress = the head of the smear (the dot), tail = the end of the smear trailing behind it
      // comet = 1 while the intro shot tears the line open (drawn as a comet instead of an ink smear)
      // straight = 1 while the intro shot flies in, so it doesn't wiggle (it left the loader in a straight line)
      const state = {
        reveal: 0,
        progress: inkAt(),
        tail: inkAt(),
        wiggle: 0,
        dotR: 0,
        comet: 0,
        straight: 0,
        cometLen: 60,
        wake: 0,
      };
      let phase = 0;
      let drops: { x: number; y: number; r: number; life: number }[] = []; // ink splatter
      let lastProgress = 0;
      let current = ""; // id of the section the dot is resting on
      // Look these up now: plain ".sig-..." strings don't resolve inside callbacks
      // that run later, like update() on scroll (same reason Hero.tsx uses contextSafe).
      const ink = root.current!.querySelector(".sig-ink"); // the white "liquid" inside the name
      const sigReveal = root.current!.querySelector(".sig-reveal");
      const stain = root.current!.querySelector(".sig-stain"); // faint grey ink left behind, drying
      // the ink is a box inside the letters: from x = INK_LEFT to the tip of the "q"
      const INK_LEFT = 6;
      const INK_RIGHT = START;
      const full = { x: INK_LEFT, width: INK_RIGHT - INK_LEFT };
      const empty = { x: INK_RIGHT, width: 0 }; // shrunk into the tip of the "q"
      let move: gsap.core.Timeline | undefined;

      // Find the section in the middle of the screen, light up its label,
      // and send the dot gliding to its marker. Above the first section (the hero), the ink goes home into the name.
      // ScrollSnap tells us which page it's gliding to, so the dot can leave right away.
      // Until that glide is over, we ignore normal scroll updates (they'd still say "old page").
      let snapUntil = 0;
      const onPageChange = (e: Event) => {
        const { id, duration } = (
          e as CustomEvent<{ id: string; duration: number }>
        ).detail;
        snapUntil = performance.now() + duration * 1000 + 200;
        setActive(id);
      };
      window.addEventListener("page-change", onPageChange);

      const update = () => {
        if (performance.now() < snapUntil) return;
        const middle = window.scrollY + window.innerHeight / 2;
        const active = sections.find(({ id }) => {
          const el = document.getElementById(id);
          return (
            !!el &&
            middle >= el.offsetTop &&
            middle < el.offsetTop + el.offsetHeight
          );
        });
        setActive(active?.id ?? "");
      };

      const setActive = (id: string) => {
        const active = sections.find((s) => s.id === id);
        if (id === current) return;
        current = id;
        sections.forEach((s) =>
          root
            .current!.querySelector(`[data-tick="${s.id}"]`)
            ?.classList.toggle("is-active", s.id === id),
        );
        move?.kill(); // stop whatever the dot was doing
        move = gsap.timeline({ defaults: { ease: "power3.inOut" } });
        if (id === "") {
          // back to the hero: the dot races to the "q" with its smear trailing behind,
          // dives in, and the ink floods back through the name from right to left
          move
            .to(state, { progress: inkAt(), duration: 1 })
            .to(state, { tail: inkAt(), duration: 1 }, "<0.2") // the tail catches up a bit later
            .to(state, { dotR: 0, duration: 0.25, ease: "power2.in" }, "<0.6")
            .to(ink, { attr: full, duration: 0.5, ease: "power2.out" }, "<0.1")
            .set(stain, { opacity: 0.3 }); // the stain sits hidden under the fresh ink, ready for next time
        } else {
          const fromHero = state.dotR < DOT_R;
          if (fromHero) {
            // leaving the hero: the ink flows out of the name, through the tip of the "q",
            // and feeds the smear. The smear's tail stays stuck to the "q" until the name is empty.
            move
              .to(state, { dotR: DOT_R, duration: 0.2, ease: "power2.out" })
              .to(ink, { attr: empty, duration: 0.9, ease: "power1.inOut" }, 0)
              .to(state, { progress: active!.at, duration: 1.1 }, 0.1)
              .to(state, { tail: active!.at, duration: 0.9 }, 0.9) // let go once the name is empty
              // the leftover stain in the letters dries up and fades away
              .fromTo(
                stain,
                { opacity: 0.3 },
                { opacity: 0, duration: 1.6, ease: "power1.out" },
                0.5,
              );
          } else {
            // between sections: the dot shoots to the marker, and the smear's tail follows a moment later
            move
              .to(state, { progress: active!.at, duration: 1 })
              .to(state, { tail: active!.at, duration: 1 }, "<0.22");
          }
        }
      };
      update();
      ScrollTrigger.create({ start: 0, end: "max", onUpdate: update });

      const draw = () => {
        phase += 0.15;
        // The faster the dot moves, the more the line wiggles; it calms down once the dot lands.
        const speed = Math.abs(state.progress - lastProgress) * w;
        lastProgress = state.progress;
        // (no wiggle while the comet tears the line open: it flies dead straight)
        state.wiggle =
          state.comet || state.straight
            ? 0
            : Math.min(MAX_WIGGLE, state.wiggle * 0.92 + speed * 0.3);
        const mid = HEIGHT / 2;
        const drawnTo = START + (w - START) * state.reveal; // how much of the line has drawn in
        const dotX = w * state.progress;

        ctx.clearRect(-edge, 0, w + edge, HEIGHT);
        ctx.lineWidth = 1;

        // The line, bending into a wave near the dot when scrolling fast.
        const yAt = (x: number) => {
          const nearDot = Math.exp(-((x - dotX) ** 2) / (2 * 120 ** 2)); // 1 at the dot, fading out
          return mid + Math.sin(x * 0.05 - phase) * state.wiggle * nearDot;
        };
        for (const [from, to, alpha] of [
          [START, Math.min(dotX, drawnTo), state.comet ? 0.25 : 0.9], // already scrolled past: bright
          [Math.max(dotX, START), drawnTo, 0.25], // still ahead: faint (never left of the line start, over the name)
        ]) {
          if (to <= from) continue;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          for (let x = from; x <= to; x += 2) ctx.lineTo(x, yAt(x));
          ctx.stroke();
        }

        // The smear: a tapered ink stroke from the tail (thin) to the dot (as thick as the dot).
        const tailX = w * state.tail;
        const len = dotX - tailX;
        if (Math.abs(len) > 1 && state.dotR > 0 && !state.comet) {
          // 0 at the tail, as thick as the dot at the head, with a slightly uneven edge like a brush
          const thickness = (x: number) =>
            state.dotR *
            Math.pow((x - tailX) / len, 0.6) *
            (0.88 + 0.12 * Math.sin(x * 0.12 + phase * 0.2));
          const steps = Math.max(2, Math.ceil(Math.abs(len) / 2));
          ctx.fillStyle = "white";
          ctx.beginPath();
          // top edge from tail to head, then bottom edge back from head to tail
          for (let i = 0; i <= steps; i++) {
            const x = tailX + (len * i) / steps;
            ctx.lineTo(x, yAt(x) - thickness(x));
          }
          for (let i = steps; i >= 0; i--) {
            const x = tailX + (len * i) / steps;
            ctx.lineTo(x, yAt(x) + thickness(x));
          }
          ctx.fill();
        }

        // Splatter: while the smear moves fast, it flicks off tiny drops that stay where they land and dry up.
        if (
          Math.abs(len) > 20 &&
          speed > 3 &&
          !state.comet &&
          Math.random() < 0.5
        ) {
          const x = tailX + len * (0.3 + Math.random() * 0.7);
          const side = Math.random() < 0.5 ? -1 : 1;
          drops.push({
            x,
            y: yAt(x) + side * (state.dotR + 2 + Math.random() * 6),
            r: 0.6 + Math.random() * 1.3,
            life: 1,
          });
        }
        drops = drops.filter((d) => (d.life -= 0.012) > 0);
        drops.forEach((d) => {
          ctx.fillStyle = `rgba(255,255,255,${d.life})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r * (0.5 + 0.5 * d.life), 0, Math.PI * 2); // shrinks as it dries
          ctx.fill();
        });

        // The wake: after the shot hits, its V-shaped trail stays hanging in the air for a moment
        // (from the screen edge to the hit point) and fades out, so you can see where it came from.
        if (state.wake > 0) {
          const hitX = INK_LEFT + 4;
          const wakeGlow = ctx.createLinearGradient(-edge, 0, hitX, 0);
          wakeGlow.addColorStop(0, "rgba(255,255,255,0)");
          wakeGlow.addColorStop(1, `rgba(255,255,255,${state.wake})`);
          ctx.fillStyle = wakeGlow;
          ctx.beginPath();
          ctx.moveTo(-edge, mid);
          ctx.lineTo(hitX, mid - DOT_R * state.wake);
          ctx.lineTo(hitX, mid + DOT_R * state.wake);
          ctx.fill();
        }

        // The comet: a glowing wedge of light trailing 60px behind the shot
        if (state.comet && state.dotR > 0) {
          // the tail is cometLen px long. Once the shot is past the name, it's never longer than
          // the line so far, so it can't cover the name.
          const tailEnd =
            dotX > START
              ? Math.max(START, dotX - state.cometLen)
              : dotX - state.cometLen;
          const glow = ctx.createLinearGradient(tailEnd, 0, dotX, 0);
          glow.addColorStop(0, "rgba(255,255,255,0)");
          glow.addColorStop(1, "white");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.moveTo(tailEnd, mid); // the pointy end of the tail
          ctx.lineTo(dotX, mid - state.dotR);
          ctx.lineTo(dotX, mid + state.dotR);
          ctx.fill();
        }

        // The dot, at the head of the smear.
        if (state.dotR > 0) {
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(dotX, yAt(dotX), state.dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      gsap.ticker.add(draw);

      // When the loader opens: write the signature, fill it with ink, draw the line, fade the labels in.
      // The impact: a shockwave ring and a burst of ink drops spraying out from where the shot hit.
      // They live in the SVG (not the canvas) so they can fly outside the nav's thin strip.
      const sig = root.current!.querySelector(".sig-svg");
      const HIT_X = INK_LEFT + 4; // where the shot hits: the left edge of the "A"
      const splashDrops = gsap.utils.toArray<SVGCircleElement>(
        ".sig-drop",
        root.current,
      );
      const shock = root.current!.querySelector(".sig-shock");
      const splash = () => {
        gsap.fromTo(
          shock,
          { attr: { r: 2 }, opacity: 0.9 },
          { attr: { r: 26 }, opacity: 0, duration: 0.5, ease: "power2.out" },
        );
        splashDrops.forEach((drop) => {
          // fly back toward the shooter and out above/below, then fall a little and dry up
          const angle = Math.PI + gsap.utils.random(-1.4, 1.4);
          const dist = gsap.utils.random(12, 40);
          gsap.fromTo(
            drop,
            {
              attr: { cx: HIT_X, cy: HEIGHT / 2, r: gsap.utils.random(1, 2.6) },
              opacity: 1,
            },
            {
              attr: {
                cx: HIT_X + Math.cos(angle) * dist,
                cy: HEIGHT / 2 + Math.sin(angle) * dist + 6,
                r: 0.4,
              },
              opacity: 0,
              duration: gsap.utils.random(0.5, 1),
              ease: "power3.out",
            },
          );
        });
      };

      // ---- Each section label "decodes" when the comet flies past its marker ----
      const ticks = sections.map(
        ({ id }) =>
          root.current!.querySelector<HTMLElement>(`[data-tick="${id}"]`)!,
      );
      const marks = ticks.map((t) => t.querySelector(".nav-tickmark")!);
      const names = ticks.map((t) => t.querySelector(".nav-name")!);
      const letters = ticks.map((t) =>
        gsap.utils.toArray<HTMLElement>(".nav-letter", t),
      );
      const revealed = sections.map(() => false); // which labels the comet has already passed
      // hide the markers and labels until the comet arrives
      gsap.set(marks, { opacity: 0 });
      gsap.set(names, { opacity: 0 });

      const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*/"; // what the letters flicker through
      const reveal = (i: number) => {
        gsap.set([marks[i], names[i]], { opacity: 1 });
        letters[i].forEach((el, k) => {
          const real = el.textContent;
          // each letter shows a random character every frame, then locks into its real letter.
          // Later letters flicker a little longer, so the word locks in from left to right.
          gsap.to(
            {},
            {
              duration: 0.25 + k * 0.05,
              onUpdate: () => {
                el.textContent =
                  CHARS[Math.floor(Math.random() * CHARS.length)];
              },
              onComplete: () => {
                el.textContent = real;
              },
            },
          );
        });
      };

      // check every frame whether the comet has just passed a marker
      const watchComet = () => {
        if (!state.comet || state.progress < 0.1) return;
        sections.forEach(({ at }, i) => {
          if (!revealed[i] && state.progress >= at) {
            revealed[i] = true;
            reveal(i);
          }
        });
      };
      gsap.ticker.add(watchComet);

      // When the loader opens: the shot that left the loader comes back in from the left,
      // hits the signature, fills it with ink, and punches out the other side to draw the nav line.
      const intro = () => {
        const px = (x: number) => x / w; // pixels -> progress along the line
        gsap
          // wait until the loader's top half has slid past the nav, so its glowing edge doesn't cross the name
          .timeline({ delay: 0.55 })
          // the outline writes itself quickly
          .fromTo(
            sigReveal,
            { attr: { width: 0 } },
            { attr: { width: 130 }, duration: 0.4, ease: "power2.out" },
          )
          // 1. the shot flies in from off-screen left, with its smear behind it
          // (drawn as a long comet, so you can see its V-shaped trail as it comes in)
          // (it sets off while the name is still finishing writing: "-=0.3")
          .set(
            state,
            {
              progress: px(-edge - 10),
              tail: px(-edge - 10),
              dotR: DOT_R,
              straight: 1,
              comet: 1,
              cometLen: 160,
            },
            "-=0.3",
          ) // just off the screen edge
          .to(state, { progress: px(HIT_X), duration: 0.28, ease: "power1.in" })
          // impact: the drop disappears into the name, ink splashes, the name gets knocked back
          .set(state, { dotR: 0, straight: 0 })
          .addLabel("impact") // a named moment in the timeline, so steps 2 and 3 can start right here
          .call(splash)
          .fromTo(
            state,
            { wake: 1 },
            {
              wake: 0,
              duration: 0.5,
              ease: "power2.out",
              immediateRender: false,
            },
            "impact",
          )
          .fromTo(
            sig,
            { x: 6, scaleX: 0.92 },
            { x: 0, scaleX: 1, duration: 0.6, ease: "elastic.out(1, 0.35)" },
            "impact",
          )
          // 2. the ink floods through the letters in the direction of the shot
          .fromTo(
            ink,
            { attr: { x: INK_LEFT, width: 0 } },
            { attr: full, duration: 0.35, ease: "power2.out" },
            "<",
          )
          .set(stain, { opacity: 0.3 })
          // 3. at the same instant, the shot bursts out of the "q" as a comet and tears the nav line open,
          //    speeding up as it goes (power2.in) until it leaves the screen
          .set(
            state,
            {
              progress: px(START),
              tail: px(START),
              dotR: DOT_R,
              comet: 1,
              cometLen: 60,
            },
            "impact",
          )
          .to(
            state,
            { progress: 1.02, reveal: 1, duration: 0.45, ease: "power2.in" },
            "impact",
          )
          // the shot is gone; the dot's home is back inside the name
          .set(state, { progress: inkAt(), tail: inkAt(), dotR: 0, comet: 0 })
          // that jump back home isn't real movement, so don't let it make the line wiggle
          .call(() => {
            lastProgress = state.progress;
          });
      };
      window.addEventListener("loader-done", intro, { once: true });

      return () => {
        gsap.ticker.remove(draw);
        gsap.ticker.remove(watchComet);
        window.removeEventListener("resize", resize);
        window.removeEventListener("loader-done", intro);
        window.removeEventListener("page-change", onPageChange);
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-x-6 top-6 z-40 mix-blend-difference md:inset-x-10"
    >
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ height: HEIGHT }}
      />
      {/* The signature. Clicking it goes back to the top. */}
      <a
        href="#"
        aria-label="Afiq, back to top"
        className="pointer-events-auto absolute top-0 left-0"
      >
        <svg
          width="130"
          height="50"
          viewBox="0 0 130 50"
          className="sig-svg overflow-visible"
        >
          <defs>
            {/* a box that grows from left to right, showing the name as if it's being written */}
            <clipPath id="sig-reveal">
              <rect className="sig-reveal" x="0" y="0" width="0" height="50" />
            </clipPath>
            {/* the ink can only show inside the letters */}
            <clipPath id="sig-letters">
              <text
                x="8"
                y="33"
                fontSize="40"
                fontStyle="italic"
                className="font-display"
              >
                Afiq
              </text>
            </clipPath>
          </defs>
          <g clipPath="url(#sig-reveal)">
            {/* the ink: a white box inside the letters. Squeezing it to the right empties the name. */}
            <g clipPath="url(#sig-letters)">
              {/* the dried-ink stain, under the ink */}
              <rect
                className="sig-stain"
                x="6"
                y="0"
                width="82"
                height="50"
                fill="white"
                opacity="0"
              />
              <rect
                className="sig-ink"
                x="6"
                y="0"
                width="0"
                height="50"
                fill="white"
              />
            </g>
            {/* the white outline of the name, always visible */}
            <text
              x="8"
              y="33"
              fontSize="40"
              fontStyle="italic"
              fill="none"
              stroke="white"
              strokeWidth="1"
              className="font-display"
            >
              Afiq
            </text>
          </g>
          {/* impact effects: a shockwave ring and 14 ink drops (hidden until the shot hits) */}
          <circle
            className="sig-shock"
            cx="12"
            cy="20"
            r="0"
            fill="none"
            stroke="white"
            opacity="0"
          />
          {Array.from({ length: 14 }, (_, i) => (
            <circle
              key={i}
              className="sig-drop"
              cx="0"
              cy="0"
              r="0"
              fill="white"
              opacity="0"
            />
          ))}
        </svg>
      </a>
      {sections.map(({ label, id, at }) => (
        <a
          key={id}
          href={`#${id}`}
          data-tick={id}
          className="nav-tick group pointer-events-auto absolute top-0 -translate-x-1/2 px-3"
          style={{ left: `${at * 100}%` }}
        >
          <span className="nav-tickmark mx-auto mt-[17px] block h-1.5 w-px origin-top bg-white/50 group-hover:bg-white" />
          {/* on small screens only the active label shows, so 7 labels don't overlap */}
          <span className="nav-name mt-2 hidden text-[10px] md:block tracking-[0.2em] whitespace-nowrap text-white/40 uppercase transition-colors group-hover:text-white">
            {/* each letter is its own span, so the intro can animate them one by one */}
            {[...label].map((char, i) => (
              <span key={i} className="nav-letter inline-block">
                {char}
              </span>
            ))}
          </span>
        </a>
      ))}
    </div>
  );
}
