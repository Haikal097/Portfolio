// The Projects band: a thick white band with "PROJECTS" written along it.
// It is one of the hero's rings, continued: it runs down the left side of the ring,
// past the bottom of the hero, and curves away down and off the right side of Projects.
//
// When it appears and goes away:
// - Hero → Projects (scroll): the ring itself turns into the band (heroToProjects).
// - Projects → Hero (scroll): the band rolls back into the ring (projectsToHero).
// - Gliding into Projects from About, or a far jump landing on Projects: it sweeps in (sweepIn).
// - A far jump back to the hero: the band is removed once it's off screen (clearBand).

import gsap from "gsap";

const SVG_NS = "http://www.w3.org/2000/svg";
const RING = 560; // which ring becomes the band (ring radius in moon units, see Ripples.tsx)
const TOP_ANGLE = 235; // where the full band starts on the ring (degrees, 90 = bottom, 180 = left)
const LETTERS = "PROJECTS";

let band: SVGSVGElement | null = null; // the band currently on the page, if any

// Builds the band SVG in page coordinates, so it scrolls along with the pages.
// full = true: starts up on the hero ring. full = false: starts at the top of Projects
// (so none of it ever shows on the hero).
function makeBand(full: boolean) {
  const hero = document.querySelector<HTMLElement>("section")!; // the first section is the hero
  const projects = document.getElementById("projects")!;
  const box = hero
    .querySelector<HTMLElement>(".hero-float")!
    .parentElement!.getBoundingClientRect();
  const cx = box.left + box.width / 2 + window.scrollX;
  const cy = box.top + box.height / 2 + window.scrollY;
  const unit = box.width / 490;
  const R = RING * unit;
  const thickness = 110 * unit;
  const width = document.documentElement.clientWidth;

  // the angle where the ring crosses the top of Projects
  const cut =
    180 -
    (Math.asin(Math.min(1, (projects.offsetTop - cy) / R)) * 180) / Math.PI;
  // the short band starts a little above the top of Projects (hidden by the clip below),
  // so its square end is never seen and it runs cleanly off the top edge
  const start = full ? TOP_ANGLE : Math.min(TOP_ANGLE, cut + 25);

  const point = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  };
  const [x0, y0] = point(start);
  const [x1, y1] = point(90);
  // follow the ring anticlockwise to its bottom, then keep curving: gently down and out
  // past the right edge (an S-shape, no straight part)
  const drop = window.innerHeight * 0.32;
  const span = width + thickness - x1;
  const d =
    `M${x0},${y0} A${R},${R} 0 0 0 ${x1},${y1} ` +
    `C${x1 + span * 0.45},${y1} ${x1 + span * 0.6},${y1 + drop} ${width + thickness},${y1 + drop * 1.25}`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("ring-band");
  svg.setAttribute("width", String(width));
  svg.setAttribute(
    "height",
    String(projects.offsetTop + projects.offsetHeight),
  );
  svg.style.cssText =
    "position:absolute;left:0;top:0;pointer-events:none;z-index:30;overflow:visible";
  // the short band is cut off neatly at the top of Projects, so no corner pokes into the hero
  if (!full)
    svg.style.clipPath = `inset(${projects.offsetTop}px -100px -100px -100px)`;

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("id", "ring-band");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "white");
  path.setAttribute("stroke-width", "1");
  svg.appendChild(path);

  // the text follows the same line as the band
  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("fill", "black");
  text.setAttribute("font-size", String(thickness * 0.42));
  text.setAttribute("font-weight", "700");
  text.setAttribute("letter-spacing", String(thickness * 0.14));
  text.setAttribute("dominant-baseline", "central");
  const onPath = document.createElementNS(SVG_NS, "textPath");
  onPath.setAttribute("href", "#ring-band");
  onPath.setAttribute("text-anchor", "middle");
  // "PROJECTS" is centred just past the bottom of the ring, where the band starts to curve away
  onPath.setAttribute(
    "startOffset",
    String((R * (start - 90) * Math.PI) / 180 + thickness * 0.6),
  );
  // one <tspan> per letter, so they can appear one by one
  const letters = [...LETTERS].map((ch) => {
    const t = document.createElementNS(SVG_NS, "tspan");
    t.textContent = ch;
    t.setAttribute("opacity", "0");
    onPath.appendChild(t);
    return t;
  });
  text.appendChild(onPath);
  svg.appendChild(text);

  band?.remove();
  document.body.appendChild(svg);
  band = svg;
  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length }); // not drawn yet
  return { path, letters, length, thickness };
}

// a finished band (fully drawn, letters showing), used to swap one band for another
function finishedBand(full: boolean) {
  const { path, letters, thickness } = makeBand(full);
  gsap.set(path, { strokeDashoffset: 0, attr: { "stroke-width": thickness } });
  gsap.set(letters, { attr: { opacity: 1 } });
}

export const heroToProjects = (_hero: HTMLElement, projects: HTMLElement) => {
  const { path, letters, thickness } = makeBand(true);
  return (
    gsap
      .timeline()
      // 1. the band draws itself along the ring, starting as thin as the ring...
      .to(path, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, 0)
      // 2. ...and swells into a thick band as it goes
      .to(
        path,
        {
          attr: { "stroke-width": thickness },
          duration: 1.0,
          ease: "power3.inOut",
        },
        0.25,
      )
      // 3. the page glides down to Projects at the same time
      .to(
        window,
        {
          scrollTo: { y: projects, autoKill: false },
          duration: 1.3,
          ease: "power3.inOut",
        },
        0.3,
      )
      // 4. the letters pop in one by one, once the band is wide enough
      .to(
        letters,
        { attr: { opacity: 1 }, duration: 0.25, stagger: 0.05, ease: "none" },
        1.05,
      )
      // 5. swap to the band that starts at the top of Projects (the hero part is off screen now,
      //    so you can't see the swap), so a far jump home never shows a piece of it on the hero
      .call(() => finishedBand(false))
  );
};

export const projectsToHero = (_projects: HTMLElement, hero: HTMLElement) => {
  const tl = gsap.timeline();
  if (band) {
    // swap to the full band (still off screen up there), so it can roll back into the ring
    finishedBand(true);
    const path = band!.querySelector("path")!;
    const length = path.getTotalLength();
    tl.to(
      band!.querySelectorAll("tspan"),
      {
        attr: { opacity: 0 },
        duration: 0.15,
        stagger: { each: 0.03, from: "end" },
      },
      0,
    )
      .to(
        path,
        { attr: { "stroke-width": 1 }, duration: 0.8, ease: "power3.inOut" },
        0.1,
      )
      .to(
        path,
        { strokeDashoffset: length, duration: 1.0, ease: "power2.inOut" },
        0.2,
      )
      .call(clearBand);
  }
  tl.to(
    window,
    {
      scrollTo: { y: hero, autoKill: false },
      duration: 1.2,
      ease: "power3.inOut",
    },
    0,
  );
  return tl;
};

// The band sweeps in from the top-left edge of Projects. `at` and `duration` are in seconds,
// so it can be timed to whatever move is happening (a fast fly-through or a slow arrival).
export const sweepIn = (at: number, duration: number) => {
  const tl = gsap.timeline();
  if (band) return tl; // already there
  const { path, letters, thickness } = makeBand(false);
  gsap.set(path, { attr: { "stroke-width": thickness } });
  return tl
    .to(path, { strokeDashoffset: 0, duration, ease: "power3.out" }, at)
    .to(
      letters,
      {
        attr: { opacity: 1 },
        duration: 0.2,
        stagger: duration * 0.05,
        ease: "none",
      },
      at + duration * 0.4,
    );
};

// Removes the band right away (used when a far jump lands on the hero: it's off screen by then)
export const clearBand = () => {
  band?.remove();
  band = null;
};
