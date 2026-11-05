// Three social links floating in the moon's curve, next to your head.
// Positions are in moon units (the moon's centre is 0,0 and its radius is 245),
// placed along an arc at radius 200, so they follow the shape of the moon.
// Classes starting with "hero-" are animated by Hero.tsx.

const socials = [
  {
    label: "GitHub",
    href: "https://github.com/Haikal097",
    angle: -72,
    icon: "code",
  },
  { label: "LinkedIn", href: "#", angle: -49, icon: "in" },
  { label: "Instagram", href: "#", angle: -26, icon: "camera" },
] as const;

const ARC = 215; // distance from the moon's centre
const SIZE = 46; // bubble size in moon units

function Icon({ name }: { name: (typeof socials)[number]["icon"] }) {
  const common = {
    width: "42%",
    height: "42%",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "code")
    return (
      <svg {...common}>
        <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
      </svg>
    );
  if (name === "in")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5v.01" />
    </svg>
  );
}

export default function Socials() {
  return (
    <>
      {socials.map(({ label, href, angle, icon }) => {
        const a = (angle * Math.PI) / 180;
        // convert moon units to % of the 490-wide box
        const left = ((ARC * Math.cos(a) + 245) / 490) * 100;
        const top = ((ARC * Math.sin(a) + 245) / 490) * 100;
        const size = (SIZE / 490) * 100;
        return (
          // outer box: GSAP pops it in and makes it float
          <div
            key={label}
            className="hero-social absolute z-10"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}%`,
              aspectRatio: "1",
              translate: "-50% -50%",
            }}
          >
            {/* inner link: CSS handles the hover */}
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="group flex h-full w-full items-center justify-center rounded-full border border-white/40 bg-black text-white transition duration-300 hover:scale-125 hover:border-white hover:bg-white hover:text-black"
            >
              <Icon name={icon} />
              {/* little label that slides out on hover */}
              <span className="pointer-events-none absolute left-full ml-3 translate-x-[-6px] text-[10px] tracking-[0.2em] whitespace-nowrap text-white uppercase opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                {label}
              </span>
            </a>
          </div>
        );
      })}
    </>
  );
}
