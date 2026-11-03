import Hero from "@/components/Hero";
import NavLine from "@/components/NavLine";

const projects = [
  {
    title: "Project One",
    description: "A short line about what this project does.",
    tags: ["Next.js", "Tailwind"],
  },
  {
    title: "Project Two",
    description: "A short line about what this project does.",
    tags: ["React", "GSAP"],
  },
  {
    title: "Project Three",
    description: "A short line about what this project does.",
    tags: ["TypeScript"],
  },
];

export default function Home() {
  return (
    <>
      <NavLine />
      <Hero />
      {["work", "about", "contact"].map((id) => (
        <section
          key={id}
          id={id}
          className="flex min-h-screen items-center justify-center bg-black text-4xl font-extralight text-white/30 capitalize"
        >
          {id} (placeholder)
        </section>
      ))}

      {/* Footer */}
      <footer className="mt-auto border-t border-foreground/10">
        <div className="mx-auto flex max-w-5xl justify-between px-6 py-6 text-sm text-foreground/60">
          <span>© Afiq</span>
          <span className="flex gap-4">
            <a
              href="https://github.com/Haikal097"
              className="hover:text-accent"
            >
              GitHub
            </a>
            <a href="#" className="hover:text-accent">
              LinkedIn
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
