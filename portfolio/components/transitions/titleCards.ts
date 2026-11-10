// Title cards for far jumps: while the pages fly past, each one is covered by a
// black card with its chapter title ("Experience" over a big outlined "04").

import gsap from "gsap";

const TOTAL = "07"; // how many sections there are

// "04 · Experience" (the small label at the top of each Section) → ["04", "Experience"]
function titleOf(page: HTMLElement) {
  if (!page.id) return ["00", "Home"]; // the hero
  const label = page.querySelector("p")?.textContent ?? "";
  const [num, title = ""] = label.split(" · ");
  return [num, title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()];
}

// One card, placed exactly over `page` (in page coordinates, so it scrolls with it).
function makeCard(page: HTMLElement) {
  const [num, title] = titleOf(page);
  const card = document.createElement("div");
  card.style.cssText =
    `position:absolute;left:0;top:${page.offsetTop}px;width:100%;height:${page.offsetHeight}px;` +
    "z-index:34;background:#000;color:#fff;pointer-events:none;overflow:hidden";
  // The design sits in a screen-tall box, so it's centred on the screen even on a tall page.
  // The number and the title share one grid cell, so they're centred on each other.
  card.innerHTML = `
    <div style="height:100vh;display:grid;place-items:center;text-align:center">
      <div style="grid-area:1/1;display:grid;place-items:center">
        <div style="grid-area:1/1;font-family:var(--font-playfair),serif;font-style:italic;
          font-size:min(40vw,46vh);line-height:0.75;padding-right:0.06em;transform:translateY(-0.2em);
          color:transparent;-webkit-text-stroke:1px rgb(255 255 255 / 0.28)">${num}</div>
        <div style="grid-area:1/1">
          <div style="font-size:11px;letter-spacing:0.45em;padding-left:0.45em;color:rgb(255 255 255 / 0.5)">
            CHAPTER ${num} — ${TOTAL}</div>
          <div style="font-family:var(--font-playfair),serif;font-style:italic;
            font-size:clamp(44px,8vw,110px);line-height:1.15;margin-top:8px;padding-right:0.08em">${title}</div>
          <div style="width:60px;height:1px;background:#fff;margin:16px auto 0;opacity:0.6"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(card);
  return card;
}

// Covers every page in `pages` with its card. Returns:
// - reveal(page): a timeline that fades away the card on the page you landed on
// - remove(): takes all the cards away again
export function titleCards(pages: HTMLElement[]) {
  const cards = pages.map(makeCard);
  return {
    reveal: (page: HTMLElement) => {
      const card = cards[pages.indexOf(page)];
      return (
        gsap
          .timeline()
          // the title shrinks a touch and fades, then the black card fades to show the page
          .to(card.firstElementChild, {
            opacity: 0,
            scale: 0.96,
            duration: 0.3,
            ease: "power2.in",
          })
          .to(
            card,
            { opacity: 0, duration: 0.45, ease: "power2.inOut" },
            "<0.15",
          )
      );
    },
    remove: () => cards.forEach((card) => card.remove()),
  };
}
