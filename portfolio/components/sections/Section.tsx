// One full-screen block per nav marker. The id must match the nav's SECTIONS ids,
// because NavLine finds each section with document.getElementById(id).
// For now each one is a placeholder; we'll swap in the real content one by one.

import type { ReactNode } from "react";

type Props = {
  id: string;
  number: string; // "01", "02", ...
  title: string;
  children?: ReactNode;
};

export default function Section({ id, number, title, children }: Props) {
  return (
    <section
      id={id}
      // scroll-mt leaves room for the fixed nav when you jump to a section
      className="relative min-h-screen scroll-mt-24 border-t border-white/10 bg-black px-6 py-28 text-white md:px-16"
    >
      <p className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
        {number} · {title}
      </p>
      {children ?? (
        <p className="mt-6 text-4xl font-extralight text-white/25">
          Coming soon
        </p>
      )}
    </section>
  );
}
