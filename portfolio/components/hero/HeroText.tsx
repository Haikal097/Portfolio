// The headline and intro text on the left of the hero.
// Classes starting with "hero-" are animated by Hero.tsx.

const LINE_1 = "Ideas that ";
const WORD = "flow"; // the special word that flows in
const LINE_2 = "into motion.";

export default function HeroText() {
  return (
    <>
      {/* Text on the left */}
      <div className="absolute top-1/2 left-6 z-10 max-w-xl -translate-y-1/2 md:left-16">
        <p className="hero-fade text-[11px] tracking-[0.2em] text-white/45 uppercase">
          Hi, I&apos;m Afiq
        </p>
        {/* Every letter is its own span, so Hero.tsx can "type" them one by one.
            aria-label gives screen readers the whole sentence in one go. */}
        <h1
          aria-label="Ideas that flow into motion."
          className="mt-5 text-5xl leading-[1.1] font-light tracking-tight md:text-7xl"
        >
          {/* min-h keeps each line's height even while it's still empty,
              so the text doesn't jump when line 2 starts typing */}
          <span aria-hidden className="block min-h-[1.1em]">
            {[...LINE_1].map((char, i) => (
              <span key={i} className="hero-type-1">
                {char}
              </span>
            ))}
            <span className="hero-caret-1 hero-caret" />
            {/* pr-[0.15em] gives the italic "w" room to lean, so it isn't cut off */}
            <em className="inline-block pr-[0.15em] font-display">
              {[...WORD].map((char, i) => (
                <span key={i} className="hero-flow inline-block">
                  {char}
                </span>
              ))}
            </em>
          </span>
          <span aria-hidden className="block min-h-[1.1em]">
            {[...LINE_2].map((char, i) => (
              <span key={i} className="hero-type-2">
                {char}
              </span>
            ))}
            <span className="hero-caret-2 hero-caret" />
          </span>
        </h1>
        <p className="hero-fade mt-4 max-w-md text-[15px] leading-relaxed font-light text-white/60">
          I&apos;m Afiq, a [student / developer] from [your city] who turns
          ideas into websites that feel alive.
        </p>
      </div>

      {/* Bottom corners */}
      <p className="hero-fade absolute bottom-8 left-6 text-[11px] tracking-[0.2em] text-white/45 uppercase md:left-16">
        ● Open for work
      </p>
      <p className="hero-fade absolute right-6 bottom-8 text-[11px] tracking-[0.2em] text-white/45 uppercase md:right-16">
        Scroll ↓
      </p>
    </>
  );
}
