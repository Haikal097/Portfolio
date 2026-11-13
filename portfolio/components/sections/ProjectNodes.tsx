"use client";

// Project rings on the Projects page: one small ring per project, sitting on its own lane.
// - Entrance: as the dot that draws each lane passes a ring's spot, the ring pops out there with a splash,
//   and its title decodes in (scrambled letters settling into the real ones), like the nav labels.
// - Idle: each ring drifts slowly along its lane, a faint ripple rolls down the six now and then,
//   and every dot breathes softly.
// - Every ring shows its title, dimmed. Hover: the ring grows, the title brightens and an arrow appears.
// - Selected (the first one on arrival, then whichever you clicked): bigger outer ring, bright dot,
//   a very soft pulse, and the brightest title.
// - Leaving the page: each ring quickly shrinks to nothing while its title fades and slides into it.
// - Click: a ripple spreads out from the ring and opens the project. Click again to go back.
// - The visible ring is small, but each one has an invisible 44px clickable area.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Pt = { x: number; y: number; s: number };
type Lane = { pts: Pt[]; len: number };

// placeholder projects: replace with your own
const PROJECTS = [
  { title: "Moonlight Portfolio", tag: "Next.js · GSAP", year: "2026" },
  { title: "Campus Lost & Found", tag: "React · Firebase", year: "2025" },
  { title: "Ripple Weather", tag: "TypeScript · API", year: "2025" },
  { title: "Budget Buddy", tag: "Flutter", year: "2025" },
  { title: "Library Booking", tag: "PHP · MySQL", year: "2024" },
  { title: "Ink Chat", tag: "Node · Socket.io", year: "2024" },
];

// where the rings sit: one per lane, in a neat slanted row.
// Ring 1 sits on lane 1 where it reaches TOP of the page height (never higher than MIN_TOP px,
// so it stays clear of the nav). Each next ring sits STEP px further along its own lane,
// so the gaps between rings are always the same, whatever the screen size.
const TOP = 0.22,
  MIN_TOP = 170,
  STEP = 80;

export default function ProjectNodes() {
  const [count, setCount] = useState(0); // how many rings (one per lane)
  const [born, setBorn] = useState<boolean[]>([]); // which rings have made their entrance
  const [leaving, setLeaving] = useState(false); // the outro is playing
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [open, setOpen] = useState<{
    i: number;
    x: number;
    y: number;
    closing?: boolean;
  } | null>(null);
  const hoverRef = useRef<number | null>(null);
  hoverRef.current = hover;
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const baseS = useRef<number[]>([]); // each ring's resting spot, as a distance along its lane
  const mouse = useRef({ x: -9999, y: -9999 });

  // movement: each ring glides slowly back and forth along its own lane.
  // It slows down as the cursor gets close (so it's easy to hit), stops while hovered,
  // and leans a few px towards the cursor.
  useEffect(() => {
    let raf = 0,
      last = performance.now();
    const phase = [0, 0, 0, 0, 0, 0];
    const speed = [1, 1, 1, 1, 1, 1];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const lanes = (window as unknown as { __lanes?: Lane[] }).__lanes;
      if (!lanes) return;
      baseS.current.forEach((s0, i) => {
        const el = btns.current[i];
        const pts = lanes[i]?.pts;
        if (!el || !pts) return;
        const box = el.parentElement!.getBoundingClientRect();
        const px = Number(el.dataset.x || 0),
          py = Number(el.dataset.y || 0);
        const mx = mouse.current.x - box.left - px,
          my = mouse.current.y - box.top - py;
        const dist = Math.hypot(mx, my);
        const calm = Math.min(1, Math.max(0, (dist - 60) / 220)); // still within 60px, full speed past 280px
        const target = hoverRef.current === i || reduce.matches ? 0 : calm;
        speed[i] += (target - speed[i]) * Math.min(1, dt * 6);
        phase[i] += dt * speed[i];
        // they all drift together (14px each way, about 14s per swing), with only a small
        // offset between them, so the spacing stays even and they never bunch up
        const s = s0 + Math.sin(phase[i] * 0.45 + i * 0.35) * 14;
        // blend between the two lane points either side of s, so it glides instead of hopping
        let k = 1;
        while (k < pts.length - 1 && pts[k].s < s) k++;
        const a = pts[k - 1],
          b = pts[k];
        const f = Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s || 1)));
        let x = a.x + (b.x - a.x) * f,
          y = a.y + (b.y - a.y) * f;
        el.dataset.x = String(x);
        el.dataset.y = String(y);
        if (dist < 70 && dist > 0) {
          const pull = (1 - dist / 70) * 6;
          x += (mx / dist) * pull;
          y += (my / dist) * pull;
        }
        // transform (not left/top) so it can sit between whole pixels
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    raf = requestAnimationFrame(tick);
    const onMove = (e: PointerEvent) =>
      (mouse.current = { x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // place the rings once the lanes are built; bring them in as the lanes draw in;
  // hide them when you leave the page
  useEffect(() => {
    let timers: number[] = [];
    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const later = (sec: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, Math.max(0, sec * 1000)));
    const place = () => {
      const lanes = (window as unknown as { __lanes?: Lane[] }).__lanes;
      const sec = document.getElementById("projects");
      if (!lanes || !sec) return;
      const H = sec.offsetHeight;
      const top = Math.max(MIN_TOP, TOP * H);
      const first = lanes[0].pts.find((p) => p.y >= top)?.s ?? 0;
      baseS.current = lanes
        .slice(0, PROJECTS.length)
        .map((_, j) => first + j * STEP);
      setCount(baseS.current.length);
    };
    // the lanes start drawing in: work out when each ring should arrive
    const onDraw = (e: Event) => {
      place();
      const lanes = (window as unknown as { __lanes?: Lane[] }).__lanes;
      if (!lanes) return;
      clear();
      setBorn([]);
      const start = (e as CustomEvent<{ start: number }>).detail.start;
      const now = performance.now() / 1000;
      // each ring pops out the moment its lane's drawing dot passes its spot
      // (lane j starts 0.12s after the one before and draws over 2.2s with power3.out,
      //  so this undoes that curve to find when the dot reaches distance s0)
      const at = baseS.current.map((s0, j) => {
        const f = Math.min(1, s0 / lanes[j].len);
        return start + j * 0.12 + 2.2 * (1 - Math.cbrt(1 - f));
      });
      at.forEach((when, j) =>
        later(when - now, () =>
          setBorn((b) => {
            const n = [...b];
            n[j] = true;
            return n;
          }),
        ),
      );
      // the first project becomes selected once they're all in
      later(Math.max(...at) - now + 0.6, () =>
        setSelected((v) => (v === null ? 0 : v)),
      );
    };
    const onChange = (e: Event) => {
      if ((e as CustomEvent<{ id: string }>).detail.id !== "projects") {
        clear();
        // play the outro (shrink and fade), then hide them for good
        setLeaving(true);
        later(0.6, () => {
          setBorn([]);
          setLeaving(false);
        });
      }
    };
    place(); // the lanes may already exist (e.g. after a hot reload)
    // after a hot reload no draw-in comes, so just show them
    if (
      Math.abs(
        document.getElementById("projects")?.getBoundingClientRect().top ?? 99,
      ) < 5
    )
      later(0.5, () => setBorn(baseS.current.map(() => true)));
    window.addEventListener("lanes-built", place);
    window.addEventListener("lanes-draw", onDraw);
    window.addEventListener("page-change", onChange);
    return () => {
      clear();
      window.removeEventListener("lanes-built", place);
      window.removeEventListener("lanes-draw", onDraw);
      window.removeEventListener("page-change", onChange);
    };
  }, []);

  const openProject = (i: number) => {
    const r = btns.current[i]!.getBoundingClientRect();
    setSelected(i);
    setOpen({ i, x: r.left, y: r.top });
  };
  const closeProject = () => {
    setOpen((o) => (o ? { ...o, closing: true } : o));
    window.setTimeout(() => setOpen(null), 950);
  };

  return (
    // pointer-events-none: only the rings themselves catch the mouse, not the whole page
    <div
      className={`pointer-events-none absolute inset-0 z-0 ${leaving ? "pn-leave" : ""}`}
    >
      <style>{CSS}</style>
      {Array.from({ length: count }, (_, i) => {
        const pr = PROJECTS[i];
        return (
          <button
            key={i}
            ref={(el) => {
              btns.current[i] = el;
            }}
            className={`pn ${born[i] ? "born" : ""} ${hover === i ? "on" : ""} ${selected === i ? "sel" : ""}`}
            style={{ ["--i" as string]: i }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => openProject(i)}
            aria-label={`${pr.title}, ${pr.year}`}
          >
            <span className="body">
              <span className="splash" />
              <span className="splash s2" />
              <span className="ring">
                <span className="core" />
                <span className="idle" />
                <span className="pulse" />
              </span>
              <span className="label">
                <span className="num">0{i + 1}</span>
                <span className="title">
                  <Decode text={pr.title} go={!!born[i]} />
                </span>
                <span className="arrow">→</span>
              </span>
            </span>
          </button>
        );
      })}
      {open &&
        createPortal(
          <div
            className={`pn-open ${open.closing ? "closing" : ""}`}
            style={{
              ["--x" as string]: open.x + "px",
              ["--y" as string]: open.y + "px",
            }}
            onClick={closeProject}
          >
            <span className="wave" />
            <span className="wave w2" />
            <div className="sheet">
              <span className="meta">
                0{open.i + 1} · {PROJECTS[open.i].year}
              </span>
              <span className="big">{PROJECTS[open.i].title}</span>
              <span className="meta">{PROJECTS[open.i].tag}</span>
              <span className="back">← back to projects</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// the title "decodes" in, like the nav labels: random letters settle into the real ones, left to right
function Decode({ text, go }: { text: string; go: boolean }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (!go) return;
    const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>*";
    let raf = 0;
    const t0 = performance.now() + 120;
    const step = (now: number) => {
      const k = Math.max(0, (now - t0) / 650); // 0.65s to settle
      setOut(
        text
          .split("")
          .map((c, i) =>
            c === " " || i < k * text.length
              ? c
              : CH[(Math.random() * CH.length) | 0],
          )
          .join(""),
      );
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [go, text]);
  return <>{out}</>;
}

const EASE = "cubic-bezier(.2,.8,.2,1)";
const CSS = `
.pn{position:absolute;left:0;top:0;width:0;height:0;padding:0;border:0;background:none;cursor:pointer;pointer-events:auto;will-change:transform}
.pn .body{position:absolute;left:0;top:0;width:0;height:0}
/* before its entrance (and after you leave) a ring is hidden and can't be clicked */
.pn:not(.born){pointer-events:none}
.pn .ring,.pn .label{opacity:0}
.pn.born .ring,.pn.born .label{opacity:1}
div .pn .label{transition:opacity .4s ease .1s,transform .4s ${EASE}}
.pn .splash{position:absolute;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:1px solid #fff;opacity:0}
.pn.born .splash{animation:pnsplash 1s ease-out .05s 1}
.pn.born .s2{animation-delay:.22s}
@keyframes pnsplash{from{transform:scale(.6);opacity:.8}to{transform:scale(4.2);opacity:0}}



/* the invisible clickable area: 44px, much bigger than the ring you see */
.pn::before{content:"";position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%}
.pn:focus-visible{outline:none}

.pn .ring{position:absolute;left:0;top:0;width:12px;height:12px;transform:translate(-50%,-50%) scale(0);border-radius:50%;border:1px solid rgba(255,255,255,.6);transition:opacity .1s ease, transform .6s cubic-bezier(.3,1.6,.5,1), width .45s ${EASE}, height .45s ${EASE}, border-color .45s}
/* it pops out (with a little overshoot) when it's born */
.pn.born .ring{transform:translate(-50%,-50%) scale(1)}
.pn .core{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:rgba(255,255,255,.75);animation:pnbreath 3.2s ease-in-out infinite;animation-delay:calc(var(--i) * -.5s);transition:all .45s ${EASE}}
.pn .idle,.pn .pulse{position:absolute;inset:-1px;border-radius:50%;border:1px solid #fff;opacity:0}
/* idle: a faint ripple rolls down the six rings one after another, every 4.8s */
.pn .idle{animation:pnidle 4.8s ease-out infinite;animation-delay:calc(var(--i) * .35s + 2.6s)}

.pn .label{position:absolute;right:24px;top:0;transform:translateY(-50%);display:flex;align-items:baseline;gap:8px;white-space:nowrap;pointer-events:none;text-shadow:0 0 4px #000,0 0 8px #000,0 0 14px #000;font-family:var(--font-geist-sans),Manrope,system-ui,sans-serif;transition:transform .4s ${EASE}}
.pn .num{font-size:9px;letter-spacing:.22em;color:rgba(255,255,255,.28);transition:color .3s ease}
.pn .title{font-size:12px;letter-spacing:.04em;color:rgba(255,255,255,.4);transition:color .3s ease,font-size .3s ease}
.pn .arrow{position:absolute;left:100%;margin-left:6px;font-size:12px;color:#fff;opacity:0;transform:translateX(-6px);transition:all .35s ${EASE}}

/* hover (or keyboard focus): the ring grows, the title brightens, an arrow appears */
.pn.on .ring{width:20px;height:20px;border-color:rgba(255,255,255,.9)}
.pn.on .core{background:#fff}
.pn.on .idle{animation:none}
.pn.on .label{transform:translate(-18px,-50%)}
.pn.on .title{color:rgba(255,255,255,.9)}
.pn.on .num{color:rgba(255,255,255,.55)}
.pn.on .arrow{opacity:1;transform:none}

/* selected: bigger outer ring, bright dot with a soft glow, a very soft pulse, the brightest title */
.pn.sel .ring{width:22px;height:22px;border-color:#fff}
.pn.sel .core{width:6px;height:6px;margin:-3px 0 0 -3px;background:#fff;box-shadow:0 0 10px rgba(255,255,255,.7);animation:none}
.pn.sel .idle{animation:none}
.pn.sel .pulse{animation:pnpulse 2.6s ease-in-out infinite}
.pn.sel .title{color:#fff;font-size:14px}
.pn.sel .num{color:rgba(255,255,255,.7)}
.pn.sel.on .ring{width:26px;height:26px}

/* ---- outro: when you leave, each ring shrinks to nothing while its title fades and slides into it,
   all within about 0.4s (.03s between rings), so they're gone before the hero shows ---- */
.pn-leave .pn{pointer-events:none}
.pn-leave .ring{animation:pnoutr .35s cubic-bezier(.4,0,.2,1) forwards;animation-delay:calc(var(--i) * .03s)}
@keyframes pnoutr{to{transform:translate(-50%,-50%) scale(0);opacity:0}}
.pn-leave .label{animation:pnoutl .3s cubic-bezier(.4,0,.2,1) forwards;animation-delay:calc(var(--i) * .03s)}
@keyframes pnoutl{to{transform:translate(14px,-50%);opacity:0}}

@keyframes pnidle{0%{transform:scale(1);opacity:0}4%{opacity:.4}35%{transform:scale(2.6);opacity:0}100%{transform:scale(2.6);opacity:0}}
@keyframes pnbreath{0%,100%{transform:scale(.8);opacity:.7}50%{transform:scale(1.15);opacity:1}}
@keyframes pnpulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.45);opacity:.08}}

/* click: a ripple spreads from the ring and fills the screen, then the project fades in.
   going back plays it in reverse, shrinking into the (still selected) ring */
.pn-open{position:fixed;inset:0;z-index:1000;cursor:pointer}
.pn-open .wave{position:absolute;left:var(--x);top:var(--y);width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:#000;border:1px solid rgba(255,255,255,.7);animation:pnfill 1.1s cubic-bezier(.6,0,.2,1) forwards}
.pn-open .w2{background:transparent;border-color:rgba(255,255,255,.35);animation-delay:.12s}
.pn-open .sheet{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;opacity:0;animation:pnsheet .6s ease .75s forwards;font-family:var(--font-geist-sans),Manrope,system-ui,sans-serif}
.pn-open .big{font-family:var(--font-playfair),"Playfair Display",Georgia,serif;font-style:italic;font-size:64px;color:#fff}
.pn-open .meta{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.pn-open .back{margin-top:30px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.pn-open.closing .sheet{animation:pnsheetout .3s ease forwards}
.pn-open.closing .wave{animation:pnshrink .8s cubic-bezier(.6,0,.2,1) .15s both}
.pn-open.closing .w2{animation-delay:.05s}
@keyframes pnfill{from{transform:scale(.3)}to{transform:scale(90)}}
@keyframes pnshrink{from{transform:scale(90)}to{transform:scale(.3);opacity:0}}
@keyframes pnsheet{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pnsheetout{from{opacity:1}to{opacity:0}}

/* people who ask their device for less motion get no drifting, ripples or pulses */
@media (prefers-reduced-motion: reduce){.pn *,.pn-open *{animation-duration:.01s!important;animation-iteration-count:1!important}}
`;
