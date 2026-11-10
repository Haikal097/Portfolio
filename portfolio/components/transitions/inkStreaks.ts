// Ink speed lines for far jumps: thin white streaks rush past the screen,
// and the thick ones fling off a little drop now and then.
// They get stronger in the middle of the jump and die down as you land.

import gsap from "gsap";

const AMOUNT = 0.2; // how much ink: 1 = a lot, 0.2 = a few sharp streaks

type Streak = {
  x: number;
  y: number;
  len: number;
  w: number;
  v: number;
  a: number;
};
type Drop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
};

// duration: how long the jump takes (s). dir: 1 = going down the page, -1 = going up.
export function inkStreaks(duration: number, dir: 1 | -1) {
  // a canvas over the whole screen, only for this jump
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:35";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "white";

  const rand = gsap.utils.random;
  const state = { p: 0 }; // goes 0 → 1 over the jump
  const streaks: Streak[] = [];
  const drops: Drop[] = [];

  // one streak: a tapered ink smear, round and thick at the head, thin at the tail
  const smear = (x: number, head: number, tail: number, width: number) => {
    ctx.beginPath();
    ctx.moveTo(x - width / 2, head);
    ctx.quadraticCurveTo(x - width * 0.15, (head + tail) / 2, x, tail);
    ctx.quadraticCurveTo(
      x + width * 0.15,
      (head + tail) / 2,
      x + width / 2,
      head,
    );
    ctx.arc(x, head, width / 2, 0, Math.PI, dir < 0);
    ctx.fill();
  };

  const draw = (_time: number, deltaTime: number) => {
    const dt = Math.min(deltaTime, 50) / 1000; // seconds since the last frame
    const k = Math.sin(Math.PI * state.p); // strength: 0 at the start and end, 1 in the middle
    ctx.clearRect(0, 0, w, h);

    // new streaks: more of them in the middle of the jump
    const count = Math.floor(k * 900 * dt * AMOUNT);
    for (let i = 0; i < count; i++) {
      streaks.push({
        x: rand(0, w),
        y: dir > 0 ? rand(h * 0.2, h * 1.3) : rand(-h * 0.3, h * 0.8),
        len: rand(60, 380),
        w: rand(1, 5),
        v: rand(1800, 4200), // pixels per second
        a: rand(0.25, 0.9),
      });
    }

    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.y -= dir * s.v * dt * (0.4 + k); // going down the page, things fly up past you
      ctx.globalAlpha = s.a * k;
      smear(s.x, s.y, s.y + dir * s.len * (0.3 + k), s.w);
      // the thick ones fling off a drop now and then
      if (s.w > 3.5 && Math.random() < 0.04) {
        drops.push({
          x: s.x,
          y: s.y,
          vx: rand(-260, 260),
          vy: -dir * rand(100, 500),
          r: rand(1, 2.6),
          life: 1,
        });
      }
      if (s.y < -s.len * 2 || s.y > h + s.len * 2) streaks.splice(i, 1); // off screen: forget it
    }

    // drops fly off, slow down and fade
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.92;
      d.vy *= 0.92;
      d.life -= dt * 1.6;
      if (d.life <= 0) {
        drops.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = d.life;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  gsap.ticker.add(draw);

  return gsap.timeline().to(state, {
    p: 1,
    duration,
    ease: "none",
    onComplete: () => {
      gsap.ticker.remove(draw);
      canvas.remove();
    },
  });
}
