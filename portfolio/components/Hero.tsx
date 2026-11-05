"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import HeroText from "./hero/HeroText";
import MoonScene from "./hero/MoonScene";
import Ripples from "./hero/Ripples";

gsap.registerPlugin(useGSAP);

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const moonBox = useRef<HTMLDivElement>(null);

  useGSAP(
    (context, contextSafe) => {
      // 1. Hide everything first (the loader is covering the page anyway)
      gsap.set([".hero-type-1", ".hero-type-2"], { display: "none" });
      gsap.set(".hero-flow", { opacity: 0 });
      gsap.set(".hero-caret", { display: "none" });
      gsap.set(".hero-fade", { opacity: 0, y: 12 });
      gsap.set(".hero-moon", { opacity: 0, scale: 0.85, rotate: -15 });
      gsap.set(".hero-me", { opacity: 0, y: -60 });
      gsap.set(".hero-social", { opacity: 0, scale: 0 });

      // Types the headline: line 1 letter by letter, then "flow" flows in like a wave,
      // then line 2. Returns a timeline so the intro can slot it in.
      const typeHeadline = () => {
        const q = gsap.utils.selector(root);
        const tl = gsap.timeline();
        const blink = gsap.fromTo(
          ".hero-caret",
          { opacity: 1 },
          {
            opacity: 0,
            duration: 0.5,
            ease: "steps(1)",
            repeat: -1,
            yoyo: true,
            paused: true,
          },
        );
        const typeLetters = (letters: Element[]) =>
          letters.forEach((letter) =>
            // each letter appears after a slightly random pause, like a real person typing
            tl.set(
              letter,
              { display: "inline" },
              `+=${gsap.utils.random(0.03, 0.09)}`,
            ),
          );

        tl.set(".hero-caret-1", { display: "inline-block" }).call(() =>
          blink.play(),
        );
        typeLetters(q(".hero-type-1"));

        // "flow": letters drift in from the right along a gentle curve, like a current carries them
        tl.fromTo(
          ".hero-flow",
          {
            opacity: 0,
            x: "1.2em",
            // each letter starts at a different height (a sine curve), so they arrive in a wave
            y: (i) => `${Math.sin(i * 1.4) * 0.25}em`,
            filter: "blur(6px)",
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            filter: "blur(0px)",
            duration: 1.2,
            ease: "power3.out",
            stagger: 0.09,
          },
          "+=0.15",
        )
          // move the caret to line 2 and keep typing
          .set(".hero-caret-1", { display: "none" }, "-=0.6")
          .set(".hero-caret-2", { display: "inline-block" }, "<");
        typeLetters(q(".hero-type-2"));

        // the caret fades away once everything is typed
        tl.to(".hero-caret-2", {
          opacity: 0,
          duration: 0.4,
          delay: 1.2,
          onStart: () => blink.kill(),
        });
        return tl;
      };

      // 2. When the loader opens, play the intro.
      // contextSafe() keeps the ".hero-..." selectors working even though this runs later.
      const intro = contextSafe!(() => {
        gsap
          .timeline({ delay: 0.3 })
          // the moon rises in, turning slightly as it grows
          .to(".hero-moon", {
            opacity: 1,
            scale: 1,
            rotate: 0,
            duration: 1.6,
            ease: "expo.out",
          })
          // you drop down onto the moon with a tiny bounce
          .to(
            ".hero-me",
            { opacity: 1, y: 0, duration: 1, ease: "back.out(1.6)" },
            "<0.4",
          )
          // the social bubbles pop out one by one
          .to(
            ".hero-social",
            {
              opacity: 1,
              scale: 1,
              duration: 0.6,
              ease: "back.out(2)",
              stagger: 0.12,
            },
            "<0.5",
          )
          // the headline types itself out, with "flow" flowing in
          .add(typeHeadline(), "<-0.2")
          .to(
            ".hero-fade",
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power2.out",
              stagger: 0.1,
            },
            "<0.4",
          )
          // when the intro is done, keep the scene gently moving
          .call(idle);
      });

      // set by idle() once the mouse effect is running, so the cleanup can remove it
      let stopMouse = () => {};

      // 3. Idle motion that loops forever after the intro
      const idle = contextSafe!(() => {
        // skip it for people who turned on "reduce motion" in their system settings
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          return;

        // the moon (with you on it) bobs up and down
        gsap.to(".hero-float", {
          y: -10,
          duration: 3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // the letters of "flow" lean away from the mouse when it gets close
        // (only on devices with a mouse; phones have no hover)
        if (window.matchMedia("(pointer: fine)").matches) {
          const letters = gsap.utils.toArray<HTMLElement>(".hero-flow");
          // quickTo makes one reusable tween per letter and property,
          // much lighter than creating a new tween on every mouse move
          const movers = letters.map((el) => ({
            el,
            x: gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" }),
            // quickTo needs GSAP's full name "rotation" ("rotate" only works in normal tweens)
            rotation: gsap.quickTo(el, "rotation", {
              duration: 0.6,
              ease: "power3.out",
            }),
          }));
          const RANGE = 220; // how close (in px) the mouse must be to push a letter
          const PUSH = 18; // how far (in px) a letter moves at most

          const onMove = (e: PointerEvent) => {
            movers.forEach((m) => {
              const box = m.el.getBoundingClientRect();
              // distance from the letter's centre to the mouse
              const dx = box.left + box.width / 2 - e.clientX;
              const dy = box.top + box.height / 2 - e.clientY;
              const dist = Math.hypot(dx, dy) || 1;
              // 1 when the mouse is on the letter, 0 when it's RANGE px away or more
              const strength = Math.max(0, 1 - dist / RANGE);
              m.x((dx / dist) * PUSH * strength);
              m.y((dy / dist) * PUSH * strength);
              // tilt away from the mouse: lean right if it's on the left, and vice versa
              m.rotation((dx / dist) * 15 * strength);
            });
          };
          window.addEventListener("pointermove", onMove);
          stopMouse = () => window.removeEventListener("pointermove", onMove);
        }

        // each social bubble floats on its own, with a random height and speed
        gsap.to(".hero-social", {
          y: "random(-9, -4)",
          duration: "random(2, 3.5)",
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.4,
        });
      });

      window.addEventListener("loader-done", intro, { once: true });
      return () => {
        window.removeEventListener("loader-done", intro);
        stopMouse(); // stop listening to the mouse when the hero unmounts
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative isolate h-screen min-h-[640px] overflow-hidden bg-black text-white"
    >
      <HeroText />
      <MoonScene boxRef={moonBox} />
      {/* after MoonScene, so the moon box exists when Ripples measures it */}
      <Ripples moonBox={moonBox} />
    </section>
  );
}
