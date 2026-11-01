import { f, follow, pick, place, point, walk } from "./trim-path.mjs";

/**
 * The seasons' trim: icicles and frost in winter, a flowering vine in spring, sunflowers in summer, and fallen leaves
 * in autumn.
 */

const LEAF = "M0,0Q2.5,-2.2 6,0Q2.5,2.2 0,0Z";
const MAPLE = "M0,5L.6,2.4L3.4,3.2L2.6,1.6L5,-.6L3.4,-1L3.8,-3.4L1.6,-2.4L0,-5L-1.6,-2.4L-3.8,-3.4L-3.4,-1L-5,-.6"
  + "L-2.6,1.6L-3.4,3.2L-.6,2.4Z";

/** How each season dresses an outline. Each piece is handed the class to add to it. */
export const SEASONS = {
  /** Frost along the edge, a crust of rime, hanging icicles, and glinting crystals. */
  winter(path, random, cls) {
    const parts = [`<path class="sdl-frost" d="${follow(path, () => 0.3)}"/>`];
    walk(path, random, 2.5, 5, s => {
      if ( random() < 0.35 ) return;
      const p = point(path, s, (random() * 1.6) - 0.6);
      parts.push(`<circle class="sdl-rime${cls(p)}" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(0.7 + random())}"/>`);
    });
    // Icicles hang straight down, so only where the edge faces downwards, and shorter where it is steep.
    walk(path, random, 9, 20, s => {
      const count = 1 + Math.floor(random() * 3);
      for ( let i = 0; i < count; i++ ) {
        const down = Math.sin(path.at(s + (i * 3.4)).n);
        if ( down < 0.45 ) continue;
        const p = { ...point(path, s + (i * 3.4)), deg: 0 };
        const w = 1.1 + random();
        const length = ((i ? 3 : 6) + (random() * (i ? 6 : 9))) * down;
        parts.push(`<polygon class="sdl-icicle${cls(p)}" ${place(p)} points="${f(-w)},-1 ${f(w)},-1 0,${f(length)}"/>`);
      }
    });
    walk(path, random, 24, 46, s => {
      const p = point(path, s, 1 + (random() * 3));
      parts.push(`<path class="sdl-glint${cls(p)}" ${place(p, random() * 60, 0.7 + (random() * 0.6))} `
        + `style="animation-delay: -${f(random() * 4)}s" d="M0,-3V3M-2.6,-1.5L2.6,1.5M-2.6,1.5L2.6,-1.5"/>`);
    });
    return parts.join("");
  },

  /** A thin vine with new leaves, and blossoms of pink, white, and lilac. */
  spring(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1 + (1.8 * Math.sin((s / 7) + phase));
    const parts = [`<path class="sdl-vine" d="${follow(path, wave)}"/>`];
    let side = 1;
    walk(path, random, 6, 10, s => {
      const p = point(path, s, wave(s));
      side = -side;
      parts.push(`<path class="sdl-leaf${random() < 0.5 ? " light" : ""}${cls(p)}" `
        + `${place(p, side * (40 + (random() * 40)), 0.7 + (random() * 0.4))} d="${LEAF}"/>`);
    });
    walk(path, random, 20, 36, s => {
      const p = point(path, s, 1.5 + (random() * 2));
      const kind = pick(random, ["pink", "white", "lilac"]);
      const petals = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 * Math.PI) / 180;
        return `<circle cx="${f(1.9 * Math.cos(a))}" cy="${f(1.9 * Math.sin(a))}" r="1.6"/>`;
      }).join("");
      parts.push(`<g class="sdl-blossom ${kind}${cls(p)}" ${place(p, random() * 72, 0.8 + (random() * 0.5))}>`
        + `${petals}<circle class="heart" r="1"/></g>`);
    });
    return parts.join("");
  },

  /** A lush vine with sunflowers, and motes of light drifting about it. */
  summer(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1 + (1.2 * Math.sin((s / 9) + phase));
    const parts = [`<path class="sdl-vine summer" d="${follow(path, wave)}"/>`];
    let side = 1;
    walk(path, random, 5, 8, s => {
      const p = point(path, s, wave(s));
      side = -side;
      parts.push(`<path class="sdl-leaf summer${cls(p)}" ${place(p, side * (35 + (random() * 45)), 0.9 + (random() * 0.5))} `
        + `d="${LEAF}"/>`);
    });
    walk(path, random, 38, 60, s => {
      const p = point(path, s, 3);
      const petals = Array.from({ length: 10 }, (_, i) => `<ellipse rx="1" ry="2.4" cy="-3" transform="rotate(${i * 36})"/>`);
      parts.push(`<g class="sdl-sunflower${cls(p)}" ${place(p, random() * 36, 0.9 + (random() * 0.35))}>`
        + `${petals.join("")}<circle class="heart" r="2.1"/></g>`);
    });
    walk(path, random, 14, 26, s => {
      const p = point(path, s, 4 + (random() * 6));
      parts.push(`<circle class="sdl-mote${cls(p)}" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(0.6 + (random() * 0.6))}" `
        + `style="animation-delay: -${f(random() * 4)}s"/>`);
    });
    return parts.join("");
  },

  /** A bare twig, with leaves of red, orange, and brown caught along it and a few fallen loose. */
  fall(path, random, cls) {
    const phase = random() * 10;
    const parts = [`<path class="sdl-twig" d="${follow(path, s => 0.8 + (0.8 * Math.sin((s / 11) + phase)))}"/>`];
    const leaf = (s, offset, scale, extra = "") => {
      const p = point(path, s, offset);
      const colour = pick(random, ["red", "orange", "amber", "brown", "rust"]);
      const shape = random() < 0.6 ? MAPLE : LEAF;
      const size = shape === MAPLE ? scale : scale * 1.4;
      parts.push(`<path class="sdl-fallen ${colour}${extra}${cls(p)}" ${place(p, random() * 360, size)} d="${shape}"/>`);
    };
    walk(path, random, 6, 12, s => leaf(s, -1 + (random() * 5), 0.5 + (random() * 0.4)));
    walk(path, random, 40, 70, s => leaf(s, 8 + (random() * 4), 0.4 + (random() * 0.25), " loose"));
    return parts.join("");
  }
};
