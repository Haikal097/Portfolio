const columns = ["01", "02", "03", "04", "05"];

export default function Hero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      {/* Soft grey glow in the background, standing in for a photo */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_60%,#2a2a2a_0%,#111_45%,#000_80%)]" />

      {/* Vertical grid lines with numbers along the bottom (hidden on phones) */}
      <div className="pointer-events-none absolute inset-x-10 top-24 bottom-0 hidden md:block">
        {columns.map((num, i) => (
          <div
            key={num}
            className="absolute top-0 bottom-16 border-l border-white/10"
            style={{ left: `${i * 25}%` }}
          >
            <span
              className={`absolute -bottom-10 -translate-x-1/2 text-lg ${i === 2 ? "text-white" : "text-white/40"}`}
            >
              {num}
            </span>
          </div>
        ))}
        {/* Dashed accent line from the logo down to the marker */}
        <div className="absolute top-6 bottom-24 left-1/2 border-l border-dashed border-white/50" />
        <div className="absolute bottom-[4.5rem] left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-b-[14px] border-x-transparent border-b-white" />
      </div>
    </section>
  );
}
