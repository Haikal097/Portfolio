import Hero from "@/components/Hero";
import NavLine from "@/components/NavLine";
import Section from "@/components/sections/Section";
import ScrollSnap from "@/components/ScrollSnap";
import ProjectsBackground from "@/components/sections/ProjectsBackground";
import ProjectNodes from "@/components/sections/ProjectNodes";

// One entry per nav marker, in the same order as the nav.
// The ids must match SECTIONS in NavLine.tsx.
const SECTIONS = [
  { id: "projects", title: "Projects" },
  { id: "about", title: "About" },
  { id: "skills", title: "Skills" },
  { id: "experience", title: "Experience" },
  { id: "education", title: "Education" },
  { id: "awards", title: "Awards" },
  { id: "contact", title: "Contact" },
];

export default function Home() {
  return (
    <>
      <NavLine />
      <ScrollSnap />
      <Hero />
      {SECTIONS.map((s, i) => (
        <Section
          key={s.id}
          id={s.id}
          title={s.title}
          number={String(i + 1).padStart(2, "0")}
        >
          {s.id === "projects" ? (
            <>
              <ProjectsBackground />
              <ProjectNodes />
            </>
          ) : undefined}
        </Section>
      ))}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-5xl justify-between px-6 py-6 text-sm text-white/60">
          <span>© Afiq</span>
          <span className="flex gap-4">
            <a href="https://github.com/Haikal097" className="hover:text-white">
              GitHub
            </a>
            <a href="#" className="hover:text-white">
              LinkedIn
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
