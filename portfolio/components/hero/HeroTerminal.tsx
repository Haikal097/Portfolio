"use client";

// A mini terminal under the intro text. Visitors can type commands, or just click the chips.
// The input stays pinned at the bottom; older answers slide up and fade out at the top.
// It types "whoami" by itself when Hero.tsx fires the "terminal-start" event.

import { useEffect, useRef, useState, type ReactNode } from "react";

// Change these to your real details.
const PROJECTS = [
  { name: "moon-portfolio", href: "#projects" },
  { name: "internship-app", href: "#projects" },
  { name: "ink-loader", href: "#projects" },
];
const EMAIL = "you@example.com";
const GITHUB = "https://github.com/Haikal097";
const LINKEDIN = "#";
const RESUME = "/resume.pdf"; // put the file in the public/ folder

const CHIPS = ["projects", "resume", "contact", "whoami"];
const TYPE_SPEED = 45; // ms per letter when a command types itself

type Line = { id: number; content: ReactNode };

// A link in the terminal output: white text with a dashed underline.
function Out({
  href,
  children,
  download,
}: {
  href: string;
  children: ReactNode;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      download={download}
      className="border-b border-dashed border-white/40 text-white hover:border-white hover:bg-white hover:text-black"
    >
      {children}
    </a>
  );
}

export default function HeroTerminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false); // true while a command types itself
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  // The answer for each command. Each answer is a list of lines.
  const answers: Record<string, () => ReactNode[]> = {
    whoami: () => [
      <span key="a" className="text-white/85">
        afiq — student developer · GMT+8
      </span>,
      <span key="b" className="text-white/40">
        I build websites that move.
      </span>,
    ],
    projects: () =>
      PROJECTS.map((p) => (
        <span key={p.name}>
          <span className="text-white/40">● </span>
          <Out href={p.href}>{p.name}</Out>
        </span>
      )),
    resume: () => [
      <span key="a" className="text-white/85">
        ✓ afiq-resume.pdf{" "}
        <Out href={RESUME} download>
          download
        </Out>
      </span>,
    ],
    contact: () => [
      <span key="a">
        <Out href={`mailto:${EMAIL}`}>email</Out>{" "}
        <span className="text-white/40">·</span> <Out href={GITHUB}>github</Out>{" "}
        <span className="text-white/40">·</span>{" "}
        <Out href={LINKEDIN}>linkedin</Out>
      </span>,
    ],
    help: () => [
      <span key="a" className="text-white/40">
        try: {CHIPS.join(" · ")} · clear
      </span>,
    ],
  };

  // Adds lines to the history (keeping only the last 20, the rest have faded out anyway).
  const print = (...contents: ReactNode[]) =>
    setLines((old) =>
      [
        ...old,
        ...contents.map((content) => ({ id: nextId.current++, content })),
      ].slice(-20),
    );

  // Runs a command: shows it in the history, then its answer.
  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === "clear") return setLines([]);
    print(
      <span>
        <span className="text-white/40">$ </span>
        {cmd}
      </span>,
      ...(answers[cmd]?.() ?? [
        <span key="a" className="text-white/40">
          command not found: {cmd} (try help)
        </span>,
      ]),
    );
  };

  // Types a command into the input letter by letter, then runs it (used by the chips and the intro).
  const typeAndRun = (cmd: string) => {
    if (typing) return;
    setTyping(true);
    setInput("");
    [...cmd].forEach((_, i) => {
      timers.current.push(
        window.setTimeout(
          () => setInput(cmd.slice(0, i + 1)),
          (i + 1) * TYPE_SPEED,
        ),
      );
    });
    timers.current.push(
      window.setTimeout(
        () => {
          run(cmd);
          setInput("");
          setTyping(false);
        },
        (cmd.length + 4) * TYPE_SPEED,
      ),
    );
  };

  // When the hero intro is done, type "whoami" once by itself.
  useEffect(() => {
    const start = () => typeAndRun("whoami");
    window.addEventListener("terminal-start", start, { once: true });
    const pending = timers.current;
    return () => {
      window.removeEventListener("terminal-start", start);
      pending.forEach(clearTimeout); // stop any typing if the hero unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hero-fade mt-6 w-full max-w-md font-mono text-[13px]">
      {/* Clicking anywhere in the window puts the text cursor in the input.
          term-glass (in globals.css) gives it the see-through glass look */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="term-glass relative overflow-hidden rounded-[10px]"
      >
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-2">
          <i className="size-[7px] rounded-full bg-white/45" />
          <i className="size-[7px] rounded-full bg-white/45" />
          <i className="size-[7px] rounded-full bg-white/45" />
          <span className="mx-auto text-[11px] tracking-[0.1em] text-white/40">
            afiq — zsh
          </span>
        </div>

        {/* History: new lines sit at the bottom and push older ones up,
            and the mask fades them out toward the top */}
        <div className="term-history flex h-24 flex-col justify-end overflow-hidden px-3.5 pt-2 pb-1 leading-[1.7]">
          {lines.map((line) => (
            <div key={line.id} className="term-line">
              {line.content}
            </div>
          ))}
        </div>

        {/* The input, pinned at the bottom */}
        <form
          onSubmit={(e) => {
            e.preventDefault(); // stop the page from reloading
            run(input);
            setInput("");
          }}
          className="flex items-center gap-2 border-t border-white/[0.07] px-3.5 py-2 leading-[1.7]"
        >
          <span className="text-white/40">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={typing}
            aria-label="Type a command"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-white caret-white outline-none"
          />
        </form>
      </div>

      {/* Chips for people who don't want to type */}
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => typeAndRun(cmd)}
            className="rounded-full border border-white/25 px-3 py-1 text-[12px] text-white/80 transition-colors hover:bg-white hover:text-black"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
