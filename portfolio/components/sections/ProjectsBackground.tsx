"use client";

// Background for the Projects page:
// 1. a wave field: 38 thin lines rolling slowly across the lower half, like dark water
// 2. six "lanes": thin lines running alongside the white band, evenly spaced,
//    that draw themselves in from the top when you arrive, roll back up with the band when you leave,
//    and softly breathe in between

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
  s: number;
  nx: number;
  ny: number;
  off: number;
  e: number;
};
// s = distance along the line, (nx, ny) = sideways direction away from the band, off = distance from the band's middle,
// e = how far the matching spot on the band is from the band's end

export default function ProjectsBackground() {
  const wavesRef = useRef<HTMLCanvasElement>(null);
  const lanesRef = useRef<HTMLCanvasElement>(null);
  // when we last arrived on / left the Projects page (seconds, performance.now() time)
  const phase = useRef({ inAt: -1, outAt: -1 });

  // ScrollSnap fires "page-change" whenever a glide starts: draw in when it heads to Projects,
  // draw out when it heads anywhere else
  useEffect(() => {
    const p = phase.current;
    const now = () => performance.now() / 1000;
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      if (id === "projects")
        p.inAt = now() + 0.3; // a beat after the band starts landing
      else if (p.inAt > p.outAt) p.outAt = now();
    };
    // opened straight onto Projects (e.g. after a refresh): draw in right away
    if (
      Math.abs(
        document.getElementById("projects")!.getBoundingClientRect().top,
      ) < 5
    )
      p.inAt = now();
    window.addEventListener("page-change", onChange);
    return () => window.removeEventListener("page-change", onChange);
  }, []);

  // ---------- 1. Wave field ----------
  useEffect(() => {
    const c = wavesRef.current!;
    const g = c.getContext("2d")!;
    let W = 0,
      H = 0,
      raf = 0;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c.offsetWidth;
      H = c.offsetHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    const LINES = 38;
    const p = phase.current;
    const ease = (k: number) =>
      k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // power3.inOut
    const clamp = (k: number) => Math.min(1, Math.max(0, k));
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = now / 1000;
      // how far the field has sunk below the page: 1 = hidden below, 0 = in place
      // arriving: it rises up, the top lines first. Leaving: it sinks away, the bottom lines first.
      const sinkOf = (k: number) =>
        p.inAt < 0
          ? 1
          : p.outAt > p.inAt
            ? ease(clamp((t - p.outAt - (LINES - k) * 0.008) / 0.8))
            : 1 - ease(clamp((t - p.inAt - k * 0.012) / 1.3));
      g.clearRect(0, 0, W, H);
      g.lineWidth = 1;
      for (let k = 0; k < LINES; k++) {
        const sink = sinkOf(k);
        if (sink >= 1) continue;
        const y0 = H * 0.42 + k * 13 + sink * H * 0.65; // starts 42% down the page, one line every 13px
        // leaving: the water swells up for a moment before it sinks
        const swell =
          p.outAt > p.inAt
            ? Math.sin(clamp((t - p.outAt) / 0.7) * Math.PI) * 2.2
            : 0;
        const amp = (6 + k * 1.4) * (1 + swell); // lower lines move more
        g.beginPath();
        for (let x = 0; x <= W; x += 4) {
          // two slow waves rolling at different speeds, so the field never repeats exactly
          const y =
            y0 +
            Math.sin(x * 0.004 + k * 0.22 - t * 0.35) * amp +
            Math.sin(x * 0.011 - k * 0.4 + t * 0.6) * amp * 0.35;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokeStyle = `rgba(255,255,255,${0.03 + (k / LINES) * 0.12})`; // brighter towards the bottom
        g.stroke();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  // ---------- 2. Lanes beside the band ----------
  useEffect(() => {
    const c = lanesRef.current!;
    const g = c.getContext("2d")!;
    const section = document.getElementById("projects")!;
    let raf = 0,
      timer = 0,
      lastWidth = -1;
    let W = 0,
      H = 0;
    let lanes: { pts: Point[]; len: number }[] = [];
    let bandWidth = 100; // the band's full width, measured when the lanes are built
    let readyAt = 0; // when the lanes were built (seconds)
    const p = phase.current;

    const COUNT = 6; // how many lanes
    const GAP = 34; // px between lanes
    const FIRST = 24; // px between the band's edge and the first lane

    const build = (band: SVGPathElement, thickness: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c.offsetWidth;
      H = c.offsetHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. sample the band's centre line every 6px, in this section's coordinates
      const top = section.offsetTop;
      const L = band.getTotalLength();
      const base: { x: number; y: number; e: number }[] = [];
      for (let l = 0; l < L; l += 6) {
        const p = band.getPointAtLength(l);
        if (p.y - top > -900 && p.y - top < H + 200)
          base.push({ x: p.x, y: p.y - top, e: L - l });
      }
      // 2. carry the band on past its end, so the smoothing below never bends the part we can see
      const end = base[base.length - 1],
        prev = base[base.length - 2];
      const ex = end.x - prev.x,
        ey = end.y - prev.y,
        em = Math.hypot(ex, ey) || 1;
      for (let k = 1; k <= 120; k++)
        base.push({
          x: end.x + (ex / em) * 6 * k,
          y: end.y + (ey / em) * 6 * k,
          e: end.e - 6 * k,
        });

      lanes = Array.from({ length: COUNT }, (_, j) => {
        const offset = thickness / 2 + FIRST + j * GAP; // same gap for every lane

        // 3. soften the band's curve: the further out a lane is, the softer its bends,
        //    so tight corners never pinch or kink (like the lanes of a curved road)
        const soft = base.map((p) => ({ ...p }));
        const sigma = (offset * 0.55) / 6;
        const passes = Math.round(2 * sigma * sigma);
        for (let pass = 0; pass < passes; pass++)
          for (let i = 1; i < soft.length - 1; i++) {
            soft[i].x = (soft[i - 1].x + soft[i].x * 2 + soft[i + 1].x) / 4;
            soft[i].y = (soft[i - 1].y + soft[i].y * 2 + soft[i + 1].y) / 4;
          }

        // 4. push every point out sideways (down-left, away from the band) by the offset
        let pts: Point[] = soft.map((p, i) => {
          const a = soft[Math.max(0, i - 1)],
            b = soft[Math.min(soft.length - 1, i + 1)];
          const tx = b.x - a.x,
            ty = b.y - a.y,
            m = Math.hypot(tx, ty) || 1;
          return {
            x: p.x - (ty / m) * offset,
            y: p.y + (tx / m) * offset,
            s: 0,
            nx: -ty / m,
            ny: tx / m,
            off: offset,
            e: p.e,
          };
        });

        // 5. drop the part above the page, so the draw-in starts right at the top edge
        const first = pts.findIndex((q) => q.y > -20);
        pts = pts.slice(Math.max(0, first - 1));
        let s = 0;
        pts.forEach((q, i) => {
          if (i) s += Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y);
          q.s = s;
        });
        return { pts, len: s };
      });
    };

    // The band is made during the hero > projects transition and starts thin, then swells.
    // Wait until it exists and has stopped growing, then build the lanes from it.
    const waitForBand = () => {
      const band = document.querySelector<SVGPathElement>("#ring-band");
      const width = band
        ? parseFloat(band.getAttribute("stroke-width") || "0")
        : 0;
      if (!band || width < 20 || width !== lastWidth) {
        lastWidth = width;
        timer = window.setTimeout(waitForBand, 150);
        return;
      }
      build(band, width);
      bandWidth = width;
      readyAt = performance.now() / 1000;
      raf = requestAnimationFrame(draw);
    };

    const clamp = (k: number) => Math.min(1, Math.max(0, k));
    const inOut = (k: number) =>
      k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = now / 1000;
      g.clearRect(0, 0, W, H);
      if (p.inAt < 0) return; // haven't been to Projects yet
      const leaving = p.outAt > p.inAt;
      lanes.forEach((lane, j) => {
        // Like a zipper: each point of a lane slides into (or out of) the band on its own timer,
        // starting at the top of the page and running down the lane.
        // f = how far down the lane the point is (0 = top, 1 = bottom)
        // mergeAt(f): 0 = in its place, 1 = hidden under the band's middle
        let mergeAt: (f: number) => number;
        let glow: number;
        let cut = -Infinity; // points whose spot on the band is less than this from the band's end are hidden
        let topCut = -Infinity; // points higher than this (px from the top of Projects) are hidden
        let drawTo = Infinity; // while arriving: how far down the lane it has drawn so far
        let tipDot = false; // show the little dot on the drawing tip
        let fade = 1; // while leaving: eases the lanes out, so they're gone before the band is removed
        if (leaving) {
          // The lanes stay with the band while it rolls back up into the hero ring:
          // - they hug it as it thins (same gap to its edge),
          // - their bottom ends shrink back together with the band's end,
          // - and their top ends pull down ahead of the hero's edge, each lane a bit further
          //   than the one before, so they never look cut off where the hero starts.
          const band = document.querySelector<SVGPathElement>("#ring-band");
          if (!band) return; // the band is gone, and so are the lanes
          const width = parseFloat(band.getAttribute("stroke-width") || "1");
          const thin = (bandWidth - width) / 2; // how much thinner each side of the band is now
          cut = parseFloat(getComputedStyle(band).strokeDashoffset) || 0; // how much of the band's end is rolled up
          const d = t - p.outAt;
          const heroShowing = Math.max(0, section.getBoundingClientRect().top); // px of hero on screen
          // each lane's top end stops at a slightly different depth, so the ends don't line up
          const depth = [50, 110, 75, 150, 100, 185][j % 6];
          topCut = depth * inOut(clamp(d / 0.45)) + heroShowing * 0.9;
          const m = Math.min(1, thin / lanes[j].pts[0].off);
          mergeAt = () => m;
          glow = Math.sin(clamp(d / 1.2) * Math.PI) * 0.5;
          // fade out smoothly from 0.35s to 1.05s, finishing just before the band is removed (~1.2s)
          fade = 1 - inOut(clamp((d - 0.35) / 0.7));
          if (fade <= 0.001) return;
        } else {
          // arriving: each lane draws itself down from the top behind a small dot,
          // 0.12s after the one before, over 2.2s
          // (the lanes can only be built once the band has finished swelling, so on the very first
          //  visit the draw-in starts from then, instead of being half done before anything shows,
          //  and on later visits it waits for the band to swell again, so every visit looks the same)
          // on every visit, wait until the band has swelled back to full width before drawing in
          if (readyAt < p.inAt) {
            const band = document.querySelector<SVGPathElement>("#ring-band");
            const width = band
              ? parseFloat(band.getAttribute("stroke-width") || "0")
              : 0;
            if (width < bandWidth - 0.5) return;
            readyAt = t;
          }
          const start = readyAt;
          const k = clamp((t - start - j * 0.12) / 2.2);
          if (k <= 0) return;
          drawTo = (1 - Math.pow(1 - k, 3)) * lane.len; // power3.out
          mergeAt = () => 0;
          glow = 0;
          tipDot = k < 1;
        }
        // once settled, the lanes breathe gently
        const breathe = glow > 0.01 ? 1 : 0.75 + 0.25 * Math.sin(t * 0.8 + j);

        // collect the points that are still showing
        const vis: { x: number; y: number }[] = [];
        lane.pts.forEach((q) => {
          if (q.e < cut || q.y < topCut || q.s > drawTo) return; // rolled up, pulled down from the top, or not drawn yet
          const slide = q.off * mergeAt(q.s / lane.len); // towards the band's middle
          vis.push({ x: q.x - q.nx * slide, y: q.y - q.ny * slide });
        });
        if (vis.length < 2) return;
        const alpha = Math.min(1, 0.28 * breathe + glow) * fade;
        g.lineWidth = 1 + glow * 0.8;
        // while leaving, both ends of each lane taper to a fine point (over TIP px),
        // so a shrinking lane looks like a pen stroke pulling back, never a hard cut
        const TIP = leaving ? 70 : 0;
        let run = 0;
        const len: number[] = [0];
        for (let k = 1; k < vis.length; k++)
          len.push(
            (run += Math.hypot(
              vis[k].x - vis[k - 1].x,
              vis[k].y - vis[k - 1].y,
            )),
          );
        const total = run;
        if (!TIP) {
          g.beginPath();
          vis.forEach((v, k) => (k ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)));
          g.strokeStyle = `rgba(255,255,255,${alpha})`;
          g.stroke();
          if (tipDot) {
            const tip = vis[vis.length - 1];
            g.beginPath();
            g.arc(tip.x, tip.y, 2, 0, Math.PI * 2);
            g.fillStyle = "rgba(255,255,255,0.9)";
            g.fill();
          }
          return;
        }
        for (let k = 1; k < vis.length; k++) {
          const along = Math.min(len[k], total - len[k - 1]); // distance to the nearer end
          const taper = Math.min(1, along / TIP);
          g.beginPath();
          g.moveTo(vis[k - 1].x, vis[k - 1].y);
          g.lineTo(vis[k].x, vis[k].y);
          g.lineWidth = (1 + glow * 0.8) * (0.3 + 0.7 * taper);
          g.strokeStyle = `rgba(255,255,255,${alpha * taper})`;
          g.stroke();
        }
      });
    };

    waitForBand();
    const onResize = () => {
      const band = document.querySelector<SVGPathElement>("#ring-band");
      if (band)
        build(band, parseFloat(band.getAttribute("stroke-width") || "0"));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <canvas ref={wavesRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={lanesRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
