"use client";

// Full-page scrolling.
// - One small scroll (wheel, swipe or arrow key) moves to the next/previous page.
//   If TRANSITIONS has a custom animation for that pair of pages, it plays; otherwise a smooth glide.
// - Clicking a nav link: the next/previous page works the same way.
//   A far page: fly past the pages in between (each covered by its title card, with ink streaks),
//   land on your page, then play its arrival effect (from ARRIVALS).

import { useEffect } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {
  heroToProjects,
  projectsToHero,
  sweepIn,
  clearBand,
} from "./transitions/ringBand";
import { inkStreaks } from "./transitions/inkStreaks";
import { titleCards } from "./transitions/titleCards";

gsap.registerPlugin(Observer, ScrollToPlugin);

const DURATION = 1.1; // seconds for the default glide
const EASE = "power3.inOut";

// Custom page-to-page transitions, named "from>to" by section id ("hero" is the top page).
// Each one gets the two page elements and returns a GSAP timeline.
// Its timeline must end with the window scrolled to `to` (e.g. with scrollTo).
type Transition = (from: HTMLElement, to: HTMLElement) => gsap.core.Timeline;
const TRANSITIONS: Record<string, Transition> = {
  "hero>projects": heroToProjects,
  "projects>hero": projectsToHero,
};

// What a page does when a far jump lands on it: the "arrival" half of the
// transition that normally leads into it. Add one whenever you give a page its own transition.
const ARRIVALS: Record<string, () => gsap.core.Timeline> = {
  projects: () => {
    clearBand(); // start fresh, so the band always sweeps in
    return sweepIn(0, 0.9);
  },
};

// the default: a smooth glide
const glide: Transition = (_from, to) =>
  gsap.timeline().to(window, {
    scrollTo: { y: to, autoKill: false },
    duration: DURATION,
    ease: EASE,
  });

// Far jumps: race past every page in between, each covered by its title card,
// with ink streaks on top. On landing, the card on your page fades away.
const flyThrough = (list: HTMLElement[], fromIndex: number, index: number) => {
  const dir = index > fromIndex ? 1 : -1;
  const distance = Math.abs(index - fromIndex);
  const to = list[index];
  // every page after the one you're leaving, up to and including yours
  const passed = list.filter((_, i) =>
    dir > 0 ? i > fromIndex && i <= index : i < fromIndex && i >= index,
  );
  const cards = titleCards(passed);

  const d = Math.min(0.7 + distance * 0.18, 1.6); // longer jumps take a little longer
  return gsap
    .timeline()
    .to(
      window,
      { scrollTo: { y: to, autoKill: false }, duration: d, ease: EASE },
      0,
    )
    .add(inkStreaks(d, dir), 0)
    .add(cards.reveal(to), d + 0.1) // landed: your page's title stays a moment, then fades away
    .call(cards.remove);
};

export default function ScrollSnap() {
  useEffect(() => {
    // every "page", top to bottom: the hero, the 7 sections and the footer
    const pages = () => gsap.utils.toArray<HTMLElement>("section, footer");
    const nameOf = (el: HTMLElement) =>
      el.id || (el.tagName === "FOOTER" ? "footer" : "hero");
    let busy = false; // true while a transition is playing

    // which page is closest to the top of the screen right now
    const current = () => {
      const list = pages();
      let best = 0;
      list.forEach((el, i) => {
        const distance = Math.abs(el.offsetTop - window.scrollY);
        if (distance < Math.abs(list[best].offsetTop - window.scrollY))
          best = i;
      });
      return best;
    };

    // tell the nav where we're going, so its dot sets off right away
    const announce = (to: HTMLElement, duration: number) => {
      if (to.tagName === "FOOTER") return; // the footer isn't a nav page
      window.dispatchEvent(
        new CustomEvent("page-change", { detail: { id: to.id, duration } }),
      );
    };

    // unlock only once everything is done (+ a short pause,
    // so one hard flick of the wheel can't skip 2 pages)
    const unlockAfter = (tl: gsap.core.Timeline) =>
      tl.eventCallback("onComplete", () => {
        gsap.delayedCall(0.15, () => (busy = false));
      });

    const move = (index: number) => {
      const list = pages();
      const fromIndex = current();
      if (busy || index < 0 || index >= list.length || index === fromIndex)
        return;
      busy = true;
      const from = list[fromIndex];
      const to = list[index];

      // next/previous page: its custom transition, or the glide
      if (Math.abs(index - fromIndex) === 1) {
        const custom = TRANSITIONS[`${nameOf(from)}>${nameOf(to)}`];
        const tl = (custom ?? glide)(from, to);
        // gliding into Projects from About: the band sweeps in as the page lands
        if (to.id === "projects" && !custom)
          tl.add(sweepIn(tl.duration() * 0.55, 0.9), 0);
        announce(to, tl.duration());
        unlockAfter(tl);
        return;
      }

      // far away (only from nav clicks): fly through, then your page's arrival effect
      const fly = flyThrough(list, fromIndex, index);
      if (index === 0) fly.call(clearBand); // back home: the band is off screen by now
      announce(to, fly.duration());
      fly.eventCallback("onComplete", () => {
        unlockAfter(ARRIVALS[to.id]?.() ?? gsap.timeline());
      });
    };

    // wheel and touch swipes (and block the normal scrolling)
    const observer = Observer.create({
      target: window,
      type: "wheel,touch",
      wheelSpeed: -1, // flips the wheel so "wheel down" counts as onUp, like a swipe up
      tolerance: 10, // how far you must scroll before it counts
      preventDefault: true,
      onUp: () => move(current() + 1), // wheel down / swipe up = next page
      onDown: () => move(current() - 1), // wheel up / swipe down = previous page
    });

    // arrow keys, Page Up/Down and space work too
    const onKey = (e: KeyboardEvent) => {
      // don't steal keys while someone types in the hero terminal
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        move(current() + 1);
      }
      if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        move(current() - 1);
      }
    };

    // nav links (href="#projects", or "#" for the Afiq logo = back to the hero)
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (!link) return;
      e.preventDefault(); // no instant browser jump
      const id = link.getAttribute("href")!.slice(1);
      const index = id ? pages().findIndex((el) => el.id === id) : 0;
      if (index >= 0) move(index);
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);

    // clean up when the page unmounts
    return () => {
      observer.kill();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null; // it only adds behaviour, nothing to show
}
