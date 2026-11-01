import { crystal, drift, hang, lantern, moon, NARROW_LEAF, pennant, planet, scatter, STAR,
  starPath } from "./trim-motifs.mjs";
import { band, f, facesDown, follow, pick, place, point, swags, walk } from "./trim-path.mjs";

/**
 * The settings' trim: the bar dressed for the world a campaign is set in, from D&D's published campaign settings.
 * Each is drawn along the bar like the adventures' trims, and chosen from the same list.
 */

/** A crescent, its horns pointing away from the frame. */
const CRESCENT = "M-2.4,0A2.6,2.6 0 1 0 2.4,0A2.1,2.1 0 1 1 -2.4,0Z";

/** The ten guilds of Ravnica, each in its two colours. */
const GUILDS = [["white", "blue"], ["blue", "black"], ["black", "red"], ["red", "green"], ["green", "white"],
  ["white", "black"], ["blue", "red"], ["black", "green"], ["red", "white"], ["green", "blue"]];

/** The five colleges of Strixhaven, each in its two colours. */
const COLLEGES = [["red", "white"], ["red", "blue"], ["green", "blue"], ["white", "black"], ["black", "green"]];

export const WORLDS = {
  /** The Forgotten Realms: the Weave as a blue ribbon, Mystra's seven-pointed stars, and Selûne's crescents. */
  realms(path, random, cls) {
    const phase = random() * 10;
    const weave = s => 2 + (1.4 * Math.sin((s / 9) + phase));
    return [
      `<path class="sdl-weave" d="${follow(path, weave)}"/>`,
      `<path class="sdl-weave faint" d="${follow(path, s => 2 - (1.4 * Math.sin((s / 9) + phase)))}"/>`,
      hang(path, random, cls, { min: 46, max: 70, offset: 5, upright: true },
        () => `<path class="sdl-mystra" d="${starPath(7, 4.2)}" transform="translate(0 2.6)"/>`),
      hang(path, random, cls, { min: 36, max: 60, offset: s => weave(s) + 1, upright: true, scale: [1.7, 2.1] },
        () => `<path class="sdl-crescent-moon" transform="translate(0 2.6)" d="${CRESCENT}"/>`),
      drift(path, random, cls, { min: 18, max: 30, offset: [3, 12] },
        r => `<path class="sdl-sparkle weave" transform="scale(${f(0.5 + (r() * 0.4))})" ${scatter(r, 4)} d="${STAR}"/>`)
    ].join("");
  },

  /** Ravnica: a band of stained glass in the ten guilds' colours, leaded, and city spires between. */
  ravnica(path, random, cls) {
    const parts = [`<path class="sdl-lead" d="${band(path, () => -0.5, () => 4.5)}"/>`];
    for ( let s = 0, i = 0; s < path.length; s += 12, i++ ) {
      const [a, b] = GUILDS[i % GUILDS.length];
      const pane = (colour, from, to) => {
        const pts = [point(path, from, 0.2), point(path, to, 0.2), point(path, to, 3.8), point(path, from, 3.8)];
        return `<path class="sdl-pane c-${colour}" d="M${pts.map(p => `${f(p.x)},${f(p.y)}`).join("L")}Z"/>`;
      };
      parts.push(pane(a, s + 0.6, s + 5.8), pane(b, s + 6.2, s + 11.4));
    }
    parts.push(hang(path, random, cls, { min: 60, max: 90, offset: 4.5, upright: true, down: 0.8, scale: [0.8, 1.2] },
      () => "<path class=\"sdl-spire\" d=\"M-1.8,0H1.8L1.2,4L.6,9L0,13L-.6,9L-1.2,4Z\"/>"));
    return parts.join("");
  },

  /** Acquisitions Incorporated: a brass chain in swags, hung with gold coins and contracts under red wax seals. */
  acqinc(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 30, 48, 6);
    const parts = [`<path class="sdl-brass-chain" d="${d}"/>`];
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 0.5);
      if ( facesDown(path, s) > 0.4 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 2)}><path class="sdl-scroll" `
        + "d=\"M-1.6,0H1.6V5.2Q0,6.2 -1.6,5.2Z\"/><path class=\"sdl-scroll-line\" d=\"M-.9,1.4H.9M-.9,2.6H.9\"/>"
        + "<circle class=\"sdl-seal\" cy=\"4.4\" r=\"1.1\"/></g>");
    }
    for ( const s of lows ) {
      const p = point(path, s, sags(s) + 3.4);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.9)}><g class="sdl-coin c-gold"><circle r="2.1"/>`
        + "<circle class=\"rim\" r=\"1.4\"/></g></g>");
    }
    return parts.join("");
  },

  /** Eberron: the lightning rail along the edge, and dragonshards of Siberys, Eberron and Khyber hung beneath. */
  eberron(path, random, cls) {
    const kinds = ["siberys", "eberron", "khyber"];
    return [
      `<path class="sdl-rail" d="${follow(path, () => 1.2)}"/>`,
      `<path class="sdl-rail spark" d="${follow(path, () => 1.2)}"/>`,
      hang(path, random, cls, { min: 9, max: 16, offset: 1.6, turn: 12, scale: [0.7, 1.2] },
        (r, i) => crystal(4 + (r() * 6), kinds[i % 3])),
      drift(path, random, cls, { min: 22, max: 40, offset: [4, 11] },
        r => `<circle class="sdl-mote c-siberys" r="${f(0.4 + (r() * 0.4))}" ${scatter(r, 4)}/>`)
    ].join("");
  },

  /** Exandria: Catha and Ruidus strung on silver, and the swirling motes and sigils of dunamis. */
  exandria(path, random, cls) {
    const { d, pins, sags } = swags(path, random, 26, 40, 4);
    const parts = [`<path class="sdl-silver-cord" d="${d}"/>`];
    pins.slice(1, -1).forEach((s, i) => {
      const p = point(path, s, 5);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, i % 2 ? 1.4 : 2)}>${moon(i % 2 ? "ruidus" : "catha")}</g>`);
    });
    walk(path, random, 40, 70, s => {
      const p = point(path, s, sags(s) + 6);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p)}><g class="sdl-spin" ${scatter(random, 20)}>`
        + "<path class=\"sdl-dunamis\" d=\"M0,0m-3,0a3,3 0 1 1 3,3a2,2 0 1 1 -2,-2a1,1 0 1 1 1,1\"/></g></g>");
    });
    parts.push(drift(path, random, cls, { min: 16, max: 28, offset: [3, 13] },
      r => `<circle class="sdl-mote c-dunamis" r="${f(0.4 + (r() * 0.5))}" ${scatter(r, 4)}/>`));
    return parts.join("");
  },

  /** Theros: a gold meander along the edge, laurel leaves, and the stars of Nyx, the gods' realm. */
  theros(path, random, cls) {
    const parts = [`<path class="sdl-meander-ground" d="${band(path, () => -0.4, () => 4.2)}"/>`];
    for ( let s = 2; s < path.length - 4; s += 6 ) {
      const p = point(path, s, 0.6);
      parts.push(`<path class="sdl-meander${cls(p)}" ${place(p)} d="M-2.4,0V3H2.4V.9H-.3V2.1"/>`);
    }
    parts.push(hang(path, random, cls, { min: 7, max: 12, offset: 4.4, turn: 30, scale: [1, 1.3] },
      (r, i) => `<path class="sdl-leaf laurel" transform="rotate(${i % 2 ? 70 : 110})" d="${NARROW_LEAF}"/>`));
    parts.push(drift(path, random, cls, { min: 10, max: 18, offset: [6, 14] },
      r => `<path class="sdl-sparkle nyx" transform="scale(${f(0.4 + (r() * 0.5))})" ${scatter(r, 4)} d="${STAR}"/>`));
    return parts.join("");
  },

  /** Strixhaven: the five colleges' pennants on a gold cord, with sparkles of study. */
  strixhaven(path, random, cls) {
    const { d, pins } = swags(path, random, 24, 32, 3);
    const parts = [`<path class="sdl-gold-cord" d="${d}"/>`];
    pins.slice(1, -1).forEach((s, i) => {
      const p = point(path, s, 0.4);
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      const [a, b] = COLLEGES[i % COLLEGES.length];
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.9)}>${pennant(a, b)}</g>`);
    });
    parts.push(drift(path, random, cls, { min: 24, max: 40, offset: [9, 15] },
      r => `<path class="sdl-sparkle arcane" transform="scale(${f(0.5 + (r() * 0.4))})" ${scatter(r, 4)} d="${STAR}"/>`));
    return parts.join("");
  },

  /** Spelljammer: Wildspace below the bar, with orbits, planets ringed and plain, and the stars beyond. */
  spelljammer(path, random, cls) {
    const colours = ["teal", "orange", "violet", "sand", "blue"];
    return [
      `<path class="sdl-wildspace" d="${band(path, () => -0.5, () => 3)}"/>`,
      `<path class="sdl-orbit" d="${follow(path, () => 9)}"/>`,
      hang(path, random, cls, { min: 40, max: 64, offset: 9, scale: [1.4, 2.1] },
        (r, i) => planet(colours[i % colours.length], r() < 0.45)),
      drift(path, random, cls, { min: 9, max: 16, offset: [1, 14] },
        r => `<circle class="sdl-star-dot" r="${f(0.3 + (r() * 0.5))}" ${scatter(r, 4)}/>`)
    ].join("");
  },

  /** Dragonlance: Krynn's three moons, white, red and black, and silver lances hung between them. */
  dragonlance(path, random, cls) {
    const moons = ["solinari", "lunitari", "nuitari"];
    const parts = [`<path class="sdl-scale-line" d="${follow(path, () => 0.8)}"/>`];
    let i = 0;
    walk(path, random, 34, 50, s => {
      const p = point(path, s, 5.5);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.9)}>${moon(moons[i++ % 3])}</g>`);
      const q = point(path, s + 17, 0.5);
      if ( s + 17 < path.length - 4 ) {
        parts.push(`<g class="sdl-piece${cls(q)}" ${place(q, i % 2 ? 38 : -38)}><path class="sdl-lance" d="M0,0V11"/>`
          + "<path class=\"sdl-lance-head\" d=\"M-1,11L0,14.5L1,11Z\"/><path class=\"sdl-pennon\" d=\"M0,2.6L2.8,3.8L0,5Z\"/></g>");
      }
    });
    return parts.join("");
  },

  /** Planescape: razorvine, its leaves like blades, and glowing portals to the planes. */
  planescape(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1.2 + (1.1 * Math.sin((s / 7) + phase));
    let side = 1;
    return [
      `<path class="sdl-razorvine" d="${follow(path, wave)}"/>`,
      hang(path, random, cls, { min: 3, max: 6, offset: wave, scale: [0.7, 1.1] }, r => {
        side = -side;
        return `<path class="sdl-blade" transform="rotate(${f(side * (40 + (r() * 40)))})" d="M0,0L.8,1.2L0,5L-.8,1.2Z"/>`;
      }),
      hang(path, random, cls, { min: 56, max: 84, offset: 4, upright: true, down: 0.8, scale: [1.4, 1.7] },
        r => `<g class="sdl-portal c-${pick(r, ["teal", "violet", "orange"])}"><path class="arch" `
          + "d=\"M-3,8V2.6A3,3 0 0 1 3,2.6V8Z\"/><path class=\"frame\" d=\"M-3,8V2.6A3,3 0 0 1 3,2.6V8\"/></g>")
    ].join("");
  },

  /** Greyhawk: the castle's battlements hung along the edge, with lanterns lit beneath the merlons. */
  greyhawk(path, random, cls) {
    const parts = [`<path class="sdl-wall" d="${band(path, () => -0.5, () => 2.4)}"/>`];
    for ( let s = 3; s < path.length - 3; s += 8 ) {
      const p = point(path, s, 2);
      parts.push(`<rect class="sdl-merlon${cls(p)}" x="-2.4" y="0" width="4.8" height="3.6" ${place(p)}/>`);
    }
    parts.push(hang(path, random, cls, { min: 36, max: 56, offset: 2.4, upright: true, down: 0.6, scale: [1.5, 1.7] },
      () => lantern()));
    return parts.join("");
  },

  /** Lorwyn-Shadowmoor: Lorwyn's sunlit flowers along the first half, giving way to Shadowmoor's thorns and gloom. */
  lorwyn(path, random, cls) {
    const half = path.length / 2;
    const phase = random() * 10;
    const wave = s => 1.2 + (1.2 * Math.sin((s / 8) + phase));
    const parts = [
      `<path class="sdl-vine lorwyn" d="${follow({ length: half, at: path.at }, wave)}"/>`,
      `<path class="sdl-vine shadowmoor" d="${follow({ length: path.length - half, at: s => path.at(s + half) },
        s => wave(s + half))}"/>`
    ];
    walk(path, random, 9, 16, s => {
      const p = point(path, s, wave(s));
      if ( s < half ) {
        parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, random() * 60, 0.7 + (random() * 0.4))}>`
          + `<g class="sdl-bloom c-${pick(random, ["gold", "sun", "white"])}">${[0, 1, 2, 3, 4].map(i => {
            const a = (i * 72 * Math.PI) / 180;
            return `<circle cx="${f(2 * Math.cos(a))}" cy="${f(2 * Math.sin(a))}" r="1.6"/>`;
          }).join("")}<circle class="heart" r="1.1"/></g></g>`);
      }
      else if ( random() < 0.3 ) {
        parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, random() * 60, 1.1 + (random() * 0.3))}>`
          + `<g class="sdl-bloom c-gloom">${[0, 1, 2, 3, 4].map(i => {
            const a = (i * 72 * Math.PI) / 180;
            return `<path d="M0,0L${f(2.6 * Math.cos(a - 0.3))},${f(2.6 * Math.sin(a - 0.3))}L${f(3.4 * Math.cos(a))},`
              + `${f(3.4 * Math.sin(a))}L${f(2.6 * Math.cos(a + 0.3))},${f(2.6 * Math.sin(a + 0.3))}Z"/>`;
          }).join("")}<circle class="heart" r="1"/></g></g>`);
      }
      else {
        parts.push(`<path class="sdl-thorn shadowmoor${cls(p)}" ${place(p, (random() - 0.5) * 120, 1.6)} `
          + "d=\"M-.7,0L0,3.4L.7,0Z\"/>");
      }
    });
    parts.push(drift({ length: half, at: path.at }, random, cls, { min: 18, max: 30, offset: [3, 10] },
      r => `<circle class="sdl-mote c-sun" r="${f(0.4 + (r() * 0.4))}" ${scatter(r, 4)}/>`));
    parts.push(drift({ length: path.length - half, at: s => path.at(s + half) }, random, cls,
      { min: 30, max: 50, offset: [4, 9] },
      r => `<ellipse class="sdl-mist shadow" rx="${f(7 + (r() * 6))}" ry="1.8" ${scatter(r, 12)}/>`));
    return parts.join("");
  },

  /** Netheril: floating enclaves, upturned mountains crowned with towers, and the gold rings of their mythallars. */
  netheril(path, random, cls) {
    const parts = [`<path class="sdl-ley gold" d="${follow(path, () => 1.4)}"/>`];
    parts.push(hang(path, random, cls, { min: 50, max: 80, offset: 14, upright: true, down: 0.7, scale: [1.3, 1.6] },
      () => "<path class=\"sdl-isle\" d=\"M-6,0H6L3.6,3L1.4,7L0,9.4L-1.6,6.4L-3.8,2.8Z\"/>"
        + "<path class=\"sdl-isle-top\" d=\"M-6,0H6V-.8H-6Z\"/><path class=\"sdl-tower\" d=\"M-3,-.8V-4H-2V-.8M1.2,-.8V-6H2.6V-.8\"/>"
        + "<path class=\"sdl-tower\" d=\"M-3.2,-4L-2.5,-5.4L-1.8,-4M1,-6L1.9,-7.6L2.8,-6\"/>"));
    parts.push(hang(path, random, cls, { min: 70, max: 110, offset: 5, scale: [1.3, 1.6] },
      r => `<g class="sdl-spin" ${scatter(r, 20)}><circle class="sdl-mythallar" r="3"/>`
        + "<circle class=\"sdl-mythallar inner\" r=\"1.8\"/></g>"));
    return parts.join("");
  }
};
