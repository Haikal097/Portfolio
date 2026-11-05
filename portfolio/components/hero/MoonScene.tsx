import Image from "next/image";
import type { RefObject } from "react";
import Socials from "./Socials";

// The moon and you sitting on it (the rings are drawn by Ripples.tsx).
// Everything inside uses the same coordinates: (0, 0) is the centre of the moon,
// and the moon's radius is 245.
// Classes starting with "hero-" are animated by Hero.tsx.
export default function MoonScene({
  boxRef,
}: {
  boxRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={boxRef}
      className="absolute top-[54%] left-[72%] aspect-square w-[35vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2"
    >
      {/* Moon + you live in one box, so you float together and stay seated */}
      <div className="hero-float absolute inset-0 will-change-transform">
        {/* The crescent moon: a full circle with a second circle cut out of it */}
        <svg
          viewBox="-245 -245 490 490"
          className="hero-moon absolute inset-0 h-full w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.35)]"
        >
          <defs>
            <mask id="moon-cut">
              <circle r="245" fill="white" />
              <circle cx="70" cy="-75" r="215" fill="black" />
            </mask>
          </defs>
          <circle r="245" fill="#f4f4f4" mask="url(#moon-cut)" />
        </svg>

        {/* You, sitting on the moon (position and size are % of the moon box) */}
        <Image
          src="/me.png"
          alt="Afiq sitting on the moon"
          width={1110}
          height={1417}
          priority
          className="hero-me absolute h-auto"
          style={{ left: "26.7%", top: "12.4%", width: "81.6%" }}
        />
        {/* Social bubbles in the moon's curve */}
        <Socials />
      </div>
    </div>
  );
}
