import { BAT, BROAD_LEAF, loose, rune, scatter, STAR } from "./trim-motifs.mjs";
import { band, f, facesDown, follow, pick, place, point, swags, walk } from "./trim-path.mjs";

/**
 * The adventures' trim, for a GM who wants the frame dressed for the campaign rather than the season. It is drawn
 * along the bar alone, leaving the sky clear for the moons.
 */

/** How each adventure dresses an outline. Each piece is handed the class to add to it. */
export const ADVENTURES = {
  /** Curse of Strahd: a dead and thorny vine, cobwebs in the corners, a spider, bats, and drifting mist. */
  ravenloft(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1 + (1.2 * Math.sin((s / 10) + phase));
    const parts = [];
    walk(path, random, 30, 50, s => {
      const p = point(path, s, 4 + (random() * 4));
      parts.push(loose(p, `<ellipse class="sdl-mist" rx="${f(9 + (random() * 8))}" ry="${f(2 + (random() * 1.5))}" `
        + `${scatter(random, 12)}/>`));
    });
    parts.push(`<path class="sdl-deadvine" d="${follow(path, wave)}"/>`);
    let side = 1;
    walk(path, random, 3, 7, s => {
      const p = point(path, s, wave(s));
      side = -side;
      parts.push(`<path class="sdl-thorn${cls(p)}" ${place(p, side * (50 + (random() * 40)))} d="M-.6,0L0,3L.6,0Z"/>`);
    });
    for ( const s of [path.length * 0.06, path.length * 0.94] ) {
      const p = point(path, s, -1);
      const angles = [-60, -30, 0, 30, 60].map(a => (a * Math.PI) / 180);
      const at = (r, a) => `${f(r * Math.sin(a))},${f(r * Math.cos(a))}`;
      const spokes = angles.map(a => `M0,0L${at(22, a)}`);
      const rings = [6, 12, 18].map(r => `M${at(r, angles[0])}`
        + angles.slice(1).map((a, i) => `Q${at(r * 0.82, (a + angles[i]) / 2)} ${at(r, a)}`).join(""));
      parts.push(`<path class="sdl-web${cls(p)}" ${place(p)} d="${[...spokes, ...rings].join("")}"/>`);
    }
    const spider = path.length * 0.72;
    if ( facesDown(path, spider) > 0.6 ) {
      const p = { ...point(path, spider), deg: 0 };
      parts.push(`<g class="sdl-spider${cls(p)}" ${place(p)}><path class="thread" d="M0,0V9"/>`
        + "<path class=\"legs\" d=\"M-3,8L-1,10L-3,12M3,8L1,10L3,12M-3.4,10H3.4\"/><circle cy=\"10\" r=\"1.6\"/>"
        + "<circle cy=\"12.2\" r=\"1.1\"/></g>");
    }
    walk(path, random, 70, 120, s => {
      const p = point(path, s, 12 + (random() * 8));
      parts.push(`<path class="sdl-bat${cls(p)}" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f((random() - 0.5) * 30)}) scale(1.5)" `
        + `d="${BAT}"/>`);
    });
    return parts.join("");
  },

  /** The Wild Beyond the Witchlight: two curling ribbons, toadstools, sparkles, and fireflies. */
  feywild(path, random, cls) {
    const phase = random() * 10;
    const parts = [
      `<path class="sdl-ribbon-fey pink" d="${follow(path, s => 1.8 + (2 * Math.sin((s / 10) + phase)))}"/>`,
      `<path class="sdl-ribbon-fey teal" d="${follow(path, s => 1.8 - (2 * Math.sin((s / 10) + phase)))}"/>`
    ];
    walk(path, random, 26, 44, s => {
      const p = point(path, s, 0);
      parts.push(`<g class="sdl-toadstool${cls(p)}" ${place(p, (random() - 0.5) * 30, 0.8 + (random() * 0.4))}>`
        + "<path class=\"stem\" d=\"M-.9,0L-1.1,4H1.1L.9,0Z\"/><path class=\"cap\" d=\"M-4,4Q0,10 4,4Z\"/>"
        + "<circle class=\"spot\" cx=\"-1.6\" cy=\"5.2\" r=\".55\"/><circle class=\"spot\" cx=\".9\" cy=\"6\" r=\".6\"/>"
        + "<circle class=\"spot\" cx=\"2.2\" cy=\"4.8\" r=\".4\"/></g>");
    });
    walk(path, random, 30, 50, s => {
      const p = point(path, s, 3 + (random() * 4));
      parts.push(`<path class="sdl-sparkle${cls(p)}" ${place(p, random() * 45, 0.8 + (random() * 0.5))} `
        + `${scatter(random, 4)} d="${STAR}"/>`);
    });
    walk(path, random, 12, 22, s => {
      const p = point(path, s, 5 + (random() * 8));
      parts.push(loose(p, `<circle class="sdl-firefly${cls(p)}" r="${f(0.6 + (random() * 0.5))}" ${scatter(random, 4)}/>`));
    });
    return parts.join("");
  },

  /** Descent into Avernus: a hellish glow, iron spikes, hanging chains, and embers rising off the edge. */
  avernus(path, random, cls) {
    const parts = [`<path class="sdl-hellglow" d="${follow(path, () => 0.6)}"/>`];
    walk(path, random, 10, 16, s => {
      const p = point(path, s, -0.3);
      parts.push(`<polygon class="sdl-spike${cls(p)}" ${place(p, 0, 0.8 + (random() * 0.5))} points="-1.3,0 1.3,0 0,4"/>`);
    });
    const { pins, sags } = swags(path, random, 40, 70, 9);
    for ( let s = 1, i = 0; s < pins.at(-1); s += 2.6, i++ ) {
      const a = point(path, s, sags(s));
      const b = point(path, s + 0.5, sags(s + 0.5));
      const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      parts.push(`<ellipse class="sdl-link${i % 2 ? " side" : ""}${cls(a)}" cx="${f(a.x)}" cy="${f(a.y)}" rx="1.7" `
        + `ry="${i % 2 ? 0.45 : 1}" transform="rotate(${f(deg)} ${f(a.x)} ${f(a.y)})"/>`);
    }
    walk(path, random, 8, 18, s => {
      const p = point(path, s, 1 + (random() * 4));
      parts.push(loose(p, `<circle class="sdl-ember${cls(p)}" r="${f(0.5 + (random() * 0.5))}" `
        + `style="animation-delay: -${f(random() * 3)}s; animation-duration: ${f(2.4 + random())}s"/>`));
    });
    return parts.join("");
  },

  /** Rime of the Frostmaiden: a thick crust of snow, long icicles, glints, and falling snow. */
  icewind(path, random, cls) {
    const phase = random() * 10;
    const crust = s => 1.6 + (0.9 * (Math.sin((s / 6) + phase) + Math.sin((s / 2.3) + (phase * 2)) + 2) / 2);
    const parts = [`<path class="sdl-snowcrust" d="${band(path, () => -0.6, crust)}"/>`];
    walk(path, random, 6, 13, s => {
      const count = 1 + Math.floor(random() * 3);
      for ( let i = 0; i < count; i++ ) {
        const down = facesDown(path, s + (i * 3.6));
        if ( down < 0.45 ) continue;
        const p = { ...point(path, s + (i * 3.6), crust(s) - 0.6), deg: 0 };
        const w = 1.3 + random();
        const length = ((i ? 4 : 9) + (random() * (i ? 7 : 12))) * down;
        parts.push(`<polygon class="sdl-icicle${cls(p)}" ${place(p)} points="${f(-w)},-1 ${f(w)},-1 0,${f(length)}"/>`);
      }
    });
    walk(path, random, 20, 40, s => {
      const p = point(path, s, 2 + (random() * 3));
      parts.push(`<path class="sdl-glint${cls(p)}" ${place(p, random() * 60, 0.7 + (random() * 0.6))} `
        + `${scatter(random, 4)} d="M0,-3V3M-2.6,-1.5L2.6,1.5M-2.6,1.5L2.6,-1.5"/>`);
    });
    walk(path, random, 16, 28, s => {
      const p = point(path, s, 3 + (random() * 8));
      parts.push(loose(p, `<path class="sdl-flake${cls(p)}" d="M0,-1.8V1.8M-1.6,-.9L1.6,.9M-1.6,.9L1.6,-.9" `
        + `style="animation-delay: -${f(random() * 6)}s; animation-duration: ${f(5 + (random() * 3))}s"/>`));
    });
    return parts.join("");
  },

  /** Arcana Unleashed: a ley line along the edge, glowing runes, turning arcane circles, and sparkles. */
  arcana(path, random, cls) {
    const parts = [`<path class="sdl-ley" d="${follow(path, () => 1.5)}"/>`];
    walk(path, random, 9, 14, s => {
      const p = point(path, s, 4.5);
      parts.push(`<path class="sdl-rune${cls(p)}" ${place(p)} ${scatter(random, 5)} d="${rune(random)}"/>`);
    });
    walk(path, random, 70, 110, s => {
      const p = point(path, s, 7);
      parts.push(`<g class="sdl-sigil${cls(p)}" ${place(p)}><g class="sdl-spin" ${scatter(random, 20)}>`
        + "<circle r=\"3.6\"/><circle r=\"2.6\"/><polygon points=\"0,-2.6 2.25,1.3 -2.25,1.3\"/></g></g>");
    });
    walk(path, random, 24, 40, s => {
      const p = point(path, s, 9 + (random() * 5));
      parts.push(`<path class="sdl-sparkle arcane${cls(p)}" ${place(p, random() * 45, 0.6 + (random() * 0.5))} `
        + `${scatter(random, 4)} d="${STAR}"/>`);
    });
    return parts.join("");
  },

  /** Arcana Unleashed: Deadfall: Thay's crimson silk, hung with gold tassels, daggers, and red sigils. */
  thay(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 34, 56, 6);
    const parts = [`<path class="sdl-silk" d="${d}"/>`];
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 0.5);
      if ( facesDown(path, s) > 0.4 ) p.deg = 0;
      parts.push(`<g class="sdl-tassel${cls(p)}" ${place(p, 0, 1.3)}><circle class="knot" cy="1" r="1.2"/>`
        + "<path class=\"fringe\" d=\"M-1.4,1.8L-1.8,7.5H1.8L1.4,1.8Z\"/></g>");
    }
    lows.forEach((s, i) => {
      const p = point(path, s, sags(s));
      if ( i % 3 === 1 ) {
        if ( facesDown(path, s) > 0.5 ) p.deg = 0;
        parts.push(`<g class="sdl-dagger${cls(p)}" ${place(p, 0, 1.35)}><path class="grip" d="M0,.5V3.4"/>`
          + "<circle class=\"pommel\" cy=\".4\" r=\".7\"/><path class=\"guard\" d=\"M-2.2,3.4H2.2\"/>"
          + "<path class=\"blade\" d=\"M-.8,3.6L0,11L.8,3.6Z\"/></g>");
      }
      else {
        const q = point(path, s, sags(s) + 4.5);
        parts.push(`<path class="sdl-rune thay${cls(q)}" ${place(q, 0, 1.3)} ${scatter(random, 5)} d="${rune(random)}"/>`);
      }
    });
    return parts.join("");
  },

  /** World of Warcraft: riveted bronze plates along the edge, set with gems, with claws between them. */
  warcraft(path, random, cls) {
    const parts = [`<path class="sdl-plate" d="${band(path, () => -0.5, () => 4.4)}"/>`,
      `<path class="sdl-plate-edge" d="${follow(path, () => 3.8)}"/>`];
    for ( let s = 4.5; s < path.length - 2; s += 9 ) {
      const p = point(path, s, 1.9);
      parts.push(`<circle class="sdl-rivet${cls(p)}" cx="${f(p.x)}" cy="${f(p.y)}" r=".75"/>`);
    }
    const step = path.length / Math.round(path.length / 70);
    const colours = ["green", "blue", "purple", "red"];
    for ( let s = step / 2, i = 0; s < path.length; s += step, i++ ) {
      const p = point(path, s, 4);
      parts.push(`<g class="sdl-gem ${colours[i % colours.length]}${cls(p)}" ${place(p, 0, 1.4)}>`
        + "<path class=\"setting\" d=\"M-3.4,0L-2.4,3.8L0,5.8L2.4,3.8L3.4,0Z\"/>"
        + "<path class=\"stone\" d=\"M-2,.6L-1.4,3.1L0,4.4L1.4,3.1L2,.6Z\"/><path class=\"shine\" d=\"M-1,1.2L-.6,2.5\"/></g>");
      const middle = s + (step / 2);
      if ( middle > path.length - 4 ) continue;
      for ( const side of [-1, 1] ) {
        const q = point(path, middle + (side * 3.5), 4);
        parts.push(`<path class="sdl-claw${cls(q)}" ${place(q, 0, 1.3)} `
          + `d="M-1.3,0Q${side * -0.6},4 ${side * 1.8},7Q${side * 0.4},3.4 1.3,0Z"/>`);
      }
    }
    return parts.join("");
  },

  /** Vecna: Eve of Ruin: a gloom along the edge, necrotic tendrils, and the Eye, watching. */
  vecna(path, random, cls) {
    const parts = [`<path class="sdl-gloom" d="${follow(path, () => 1.5)}"/>`];
    walk(path, random, 7, 14, s => {
      const p = point(path, s, 0.5);
      const length = 6 + (random() * 7);
      const bend = 1.5 + (random() * 2);
      const turn = random() < 0.5 ? -1 : 1;
      parts.push(`<path class="sdl-tendril${cls(p)}" ${place(p, (random() - 0.5) * 40)} `
        + `d="M0,0C${f(bend)},${f(length * 0.35)} ${f(-bend)},${f(length * 0.7)} ${f(turn * bend * 0.6)},${f(length)}`
        + `q${f(turn * 1.6)},.6 ${f(turn * 1.2)},-1.2"/>`);
    });
    for ( const s of [path.length * 0.12, path.length / 2, path.length * 0.88] ) {
      const p = point(path, s, 7);
      parts.push(`<g class="sdl-eye${cls(p)}" ${place(p, 0, 1.7)}><path class="lid" d="M-4.5,0Q0,-3.4 4.5,0Q0,3.4 -4.5,0Z"/>`
        + `<circle class="iris" r="1.9" ${scatter(random, 5)}/><ellipse class="pupil" rx=".45" ry="1.6"/></g>`);
    }
    walk(path, random, 16, 28, s => {
      const p = point(path, s, 5 + (random() * 8));
      parts.push(loose(p, `<circle class="sdl-mote necrotic${cls(p)}" r="${f(0.5 + (random() * 0.5))}" ${scatter(random, 4)}/>`));
    });
    return parts.join("");
  },

  /** Tomb of Annihilation: Chult's jungle, with broad leaves, hanging lianas, bright flowers, and skulls. */
  chult(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1 + (1.4 * Math.sin((s / 8) + phase));
    const parts = [`<path class="sdl-vine jungle" d="${follow(path, wave)}"/>`];
    walk(path, random, 24, 44, s => {
      if ( facesDown(path, s) < 0.6 ) return;
      const p = { ...point(path, s, wave(s)), deg: 0 };
      const length = 8 + (random() * 10);
      const sway = (random() - 0.5) * 6;
      parts.push(`<g class="sdl-liana${cls(p)}" ${place(p)}><path d="M0,0Q${f(sway)},${f(length / 2)} 0,${f(length)}"/>`
        + `<path class="sdl-leaf jungle" transform="translate(0 ${f(length)}) rotate(${f(60 + (random() * 60))}) scale(.6)" `
        + `d="${BROAD_LEAF}"/></g>`);
    });
    let side = 1;
    walk(path, random, 6, 11, s => {
      const p = point(path, s, wave(s));
      side = -side;
      parts.push(`<path class="sdl-leaf jungle${random() < 0.35 ? " light" : ""}${cls(p)}" `
        + `${place(p, side * (30 + (random() * 40)), 0.8 + (random() * 0.5))} d="${BROAD_LEAF}"/>`);
    });
    walk(path, random, 26, 42, s => {
      const p = point(path, s, 2 + (random() * 2));
      const petals = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 * Math.PI) / 180;
        return `<circle cx="${f(2 * Math.cos(a))}" cy="${f(2 * Math.sin(a))}" r="1.8"/>`;
      }).join("");
      parts.push(`<g class="sdl-hibiscus ${pick(random, ["red", "orange", "magenta"])}${cls(p)}" `
        + `${place(p, random() * 72, 0.8 + (random() * 0.4))}>${petals}<path class="stamen" d="M0,0L2.6,1.4"/></g>`);
    });
    walk(path, random, 90, 140, s => {
      const p = point(path, s, 2.5);
      parts.push(`<g class="sdl-skull${cls(p)}" ${place(p, 0, 0.85)}>`
        + "<path class=\"bone\" d=\"M-2.6,2.6C-3,-1.6 3,-1.6 2.6,2.6L1.8,3.4V4.8H-1.8V3.4Z\"/>"
        + "<circle class=\"socket\" cx=\"-1.1\" cy=\"1.8\" r=\".75\"/><circle class=\"socket\" cx=\"1.1\" cy=\"1.8\" r=\".75\"/>"
        + "<path class=\"socket\" d=\"M0,2.8L-.4,3.5H.4Z\"/></g>");
    });
    return parts.join("");
  },

  /** Phandelver and Below: The Shattered Obelisk: dark shards of the obelisk, aberrant tentacles, and a sickly glow. */
  obelisk(path, random, cls) {
    const parts = [];
    walk(path, random, 40, 70, s => {
      const p = point(path, s, 0.5);
      const length = 10 + (random() * 7);
      const bend = 1.5 + (random() * 2);
      const turn = random() < 0.5 ? -1 : 1;
      parts.push(`<path class="sdl-tentacle${cls(p)}" ${place(p, (random() - 0.5) * 50)} `
        + `d="M0,0C${f(bend)},${f(length * 0.4)} ${f(-bend)},${f(length * 0.7)} ${f(turn * bend * 0.6)},${f(length)}`
        + `c${f(turn * 1.5)},.5 ${f(turn * 2)},-1.5 ${f(turn * 0.8)},-2.4"/>`);
    });
    walk(path, random, 10, 24, s => {
      const p = point(path, s, -0.5);
      const length = 5 + (random() * 6);
      const w = 1.4 + random();
      parts.push(`<g class="sdl-shard${cls(p)}" ${place(p, (random() - 0.5) * 50)}>`
        + `<path d="M${f(-w)},0L${f(-w * 0.6)},${f(length * 0.7)}L0,${f(length)}L${f(w * 0.5)},${f(length * 0.65)}L${f(w)},0Z"/>`
        + `<path class="facet" d="M0,0L0,${f(length)}"/></g>`);
    });
    walk(path, random, 16, 28, s => {
      const p = point(path, s, 4 + (random() * 8));
      parts.push(loose(p, `<circle class="sdl-mote aberrant${cls(p)}" r="${f(0.5 + (random() * 0.5))}" ${scatter(random, 4)}/>`));
    });
    return parts.join("");
  }
};
