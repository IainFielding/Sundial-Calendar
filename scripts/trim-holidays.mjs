import { BOLT, cloud, coin, drift, DROP, FLAME, hang, scatter, STAR } from "./trim-motifs.mjs";
import { band, f, facesDown, follow, pick, place, point, swags, walk } from "./trim-path.mjs";

/**
 * The trims for the Exandrian calendar's holidays, put up round the sky for the day while it follows the seasons,
 * like the festivals' trims. The four that mark the seasons, and three more of a kind with D&D 5e's festivals, share
 * the festivals' trims; these are the rest.
 */

const LAUREL = "M0,0C1.2,-1.4 4,-1.4 5.5,0C4,1.4 1.2,1.4 0,0Z";
const HAZEL_LEAF = "M0,0C1,-2.6 4.6,-3 6,0C4.6,3 1,2.6 0,0Z";
const FEATHER = "M0,0C.9,1.6 1.1,4.6 0,8C-1.1,4.6 -.9,1.6 0,0ZM0,.4V8.4";
const FROND = (length, random) => {
  const pairs = [];
  for ( let y = 1.2; y < length; y += 1.3 ) {
    const w = 2.2 * (1 - (y / length)) + 0.4;
    pairs.push(`M0,${f(y)}Q${f(w * 0.6)},${f(y - 0.6)} ${f(w)},${f(y + 0.4)}M0,${f(y)}Q${f(-w * 0.6)},${f(y - 0.6)} `
      + `${f(-w)},${f(y + 0.4)}`);
  }
  const curl = (random() - 0.5) * 2;
  return `M0,0Q${f(curl)},${f(length / 2)} 0,${f(length)}${pairs.join("")}`;
};

/** Candlelight standing upright in screen space: a candle with its flame. */
const floatingCandle = random => `<g class="sdl-votive" ${scatter(random, 5)}><rect class="wax" x="-.8" y="-1" `
  + `width="1.6" height="${f(2.6 + (random() * 1.6))}"/><path class="sdl-flame c-fire" transform="translate(0 -2.6) `
  + `scale(.42)" d="${FLAME}"/></g>`;

export const HOLIDAYS = {
  /** New Dawn: the first sunrise of the year, golden rays fanning out from the rim, with small suns among them. */
  newdawn(path, random, cls) {
    const parts = [];
    for ( let s = 2, i = 0; s < path.length - 1; s += 3.2, i++ ) {
      const p = point(path, s, 0.6);
      const length = i % 2 ? 3 : 6 + (random() * 2);
      parts.push(`<path class="sdl-dawn-ray${cls(p)}" ${place(p)} d="M-.7,0L0,${f(length)}L.7,0Z"/>`);
    }
    parts.push(hang(path, random, cls, { min: 40, max: 60, offset: 9, scale: [1, 1.3] },
      () => "<circle class=\"sdl-dawn-sun\" r=\"2.2\"/>"));
    return parts.join("");
  },

  /** Hillsgold: rolling golden hills along the rim, and gold catching the light above them. */
  hillsgold(path, random, cls) {
    const phase = random() * 10;
    const hills = s => 2.4 + (1.6 * Math.abs(Math.sin((s / 9) + phase)));
    return [
      `<path class="sdl-gold-hills" d="${band(path, () => -0.4, hills)}"/>`,
      `<path class="sdl-gold-hills-crest" d="${follow(path, hills)}"/>`,
      drift(path, random, cls, { min: 9, max: 16, offset: [4, 9] },
        r => `<path class="sdl-sparkle gold" transform="scale(${f(0.5 + (r() * 0.4))})" ${scatter(r, 4)} d="${STAR}"/>`)
    ].join("");
  },

  /** The Day of Challenging, the Stormlord's holy day: storm clouds round the rim, lightning, and rain. */
  challenging(path, random, cls) {
    return [
      hang(path, random, cls, { min: 8, max: 12, offset: 2, turn: 6, scale: [0.9, 1.2] }, () => cloud()),
      hang(path, random, cls, { min: 36, max: 56, offset: 3.5, upright: true, scale: [1, 1.2] },
        r => `<path class="sdl-bolt" ${scatter(r, 6)} d="${BOLT}"/>`),
      drift(path, random, cls, { min: 6, max: 11, offset: [5, 11] },
        r => `<path class="sdl-rain" d="M0,0L-.7,2.4" ${scatter(r, 1.2)}/>`)
    ].join("");
  },

  /** Merryfrond's Day: green fronds curling from the rim, and bright confetti among them. */
  merryfrond(path, random, cls) {
    return [
      hang(path, random, cls, { min: 6, max: 10, offset: 0, turn: 35, scale: [0.8, 1.1] },
        r => `<path class="sdl-frond" d="${FROND(7 + (r() * 3), r)}"/>`),
      drift(path, random, cls, { min: 6, max: 11, offset: [3, 11] },
        r => `<rect class="sdl-confetti c-${pick(r, ["red", "gold", "teal", "pink", "blue"])}" x="-.5" y="-.3" `
          + `width="1" height=".6" transform="rotate(${f(r() * 180)})"/>`)
    ].join("");
  },

  /** Deep Solace: dwarven stonework along the rim, set with glowing amber crystals. */
  deepsolace(path, random, cls) {
    const parts = [`<path class="sdl-solace-stone" d="${band(path, () => -0.4, () => 3)}"/>`];
    for ( let s = 1, i = 0; s < path.length; s += 6, i++ ) {
      const p = point(path, s, 1.5);
      parts.push(`<path class="sdl-solace-joint${cls(p)}" ${place(p)} d="M0,-1.5V1.5"/>`);
    }
    parts.push(hang(path, random, cls, { min: 14, max: 24, offset: 2.8, turn: 15, scale: [0.9, 1.3] }, r => {
      const length = 4 + (r() * 4);
      return `<path class="sdl-amber" d="M-1.2,0L-1,${f(length * 0.7)}L0,${f(length)}L1,${f(length * 0.7)}L1.2,0Z"/>`;
    }));
    return parts.join("");
  },

  /** Artisan's Faire: bunting in many colours, hung with painted jugs. */
  artisansfaire(path, random, cls) {
    const colours = ["red", "orange", "gold", "green", "teal", "blue", "violet", "pink"];
    const { d, pins, sags } = swags(path, random, 26, 40, 4);
    const parts = [`<path class="sdl-cord" d="${d}"/>`];
    let i = 0;
    for ( let s = 2; s < path.length - 2; s += 4 ) {
      const p = point(path, s, sags(s));
      parts.push(`<path class="sdl-flag c-${colours[i++ % colours.length]}${cls(p)}" ${place(p)} d="M-1.6,0H1.6L0,3.6Z"/>`);
    }
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 0.6);
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.1)}><path class="sdl-jug c-${pick(random, colours)}" `
        + "d=\"M-.8,0H.8V1L2,2.6V5.4Q2,6.4 1,6.4H-1Q-2,6.4 -2,5.4V2.6L-.8,1Z\"/>"
        + "<path class=\"sdl-jug-band\" d=\"M-2,3.8H2\"/></g>");
    }
    return parts.join("");
  },

  /** Elvendawn: a pale vine of silver leaves and white blossom, and starlight about it. */
  elvendawn(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1.2 + (1.2 * Math.sin((s / 8) + phase));
    const parts = [`<path class="sdl-vine elven" d="${follow(path, wave)}"/>`];
    let side = 1;
    walk(path, random, 5, 9, s => {
      const p = point(path, s, wave(s));
      side = -side;
      parts.push(`<path class="sdl-leaf elven${cls(p)}" ${place(p, side * (40 + (random() * 40)), 0.8)} d="${LAUREL}"/>`);
    });
    parts.push(hang(path, random, cls, { min: 18, max: 28, offset: s => wave(s) + 1.6, scale: [0.8, 1.1] },
      r => `<g class="sdl-blossom-white" transform="rotate(${f(r() * 72)})">${[0, 1, 2, 3, 4].map(k => {
        const a = (k * 72 * Math.PI) / 180;
        return `<ellipse cx="${f(1.5 * Math.cos(a))}" cy="${f(1.5 * Math.sin(a))}" rx="1.3" ry=".8" `
          + `transform="rotate(${k * 72} ${f(1.5 * Math.cos(a))} ${f(1.5 * Math.sin(a))})"/>`;
      }).join("")}<circle class="heart" r=".7"/></g>`));
    parts.push(drift(path, random, cls, { min: 12, max: 20, offset: [4, 11] },
      r => `<path class="sdl-sparkle elven" transform="scale(${f(0.4 + (r() * 0.4))})" ${scatter(r, 4)} d="${STAR}"/>`));
    return parts.join("");
  },

  /** The Morn of Largesse: purses of gifts hung on ribbons, and coins scattered between them. */
  largesse(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 30, 44, 5);
    const parts = [`<path class="sdl-gift-ribbon" d="${d}"/>`];
    for ( const s of lows ) {
      const p = point(path, s, sags(s));
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.2)}><path class="sdl-purse" `
        + "d=\"M-1,0H1L1.2,1.2Q3,2.4 2.6,4.6Q2.2,6.4 0,6.4Q-2.2,6.4 -2.6,4.6Q-3,2.4 -1.2,1.2Z\"/>"
        + "<path class=\"sdl-purse-tie\" d=\"M-1.4,1.3H1.4\"/></g>");
    }
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 2.4);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 0.9)}>${coin()}</g>`);
    }
    return parts.join("");
  },

  /** The Hazel Festival: hazel leaves round the rim, clusters of nuts, and catkins hanging. */
  hazel(path, random, cls) {
    const parts = [`<path class="sdl-twig" d="${follow(path, () => 0.8)}"/>`];
    let side = 1;
    walk(path, random, 5, 9, s => {
      const p = point(path, s, 0.8);
      side = -side;
      parts.push(`<path class="sdl-leaf hazel${cls(p)}" ${place(p, side * (35 + (random() * 40)), 0.9)} d="${HAZEL_LEAF}"/>`);
    });
    parts.push(hang(path, random, cls, { min: 16, max: 26, offset: 2.4, turn: 25, scale: [0.9, 1.2] },
      (r, i) => (i % 3 === 2
        ? "<path class=\"sdl-catkin\" d=\"M0,0Q.9,2.4 .3,5.6Q-.4,6.4 -.5,5.4Q-.9,2.4 0,0Z\"/>"
        : "<g class=\"sdl-hazelnut\"><circle cx=\"-1\" cy=\"2\" r=\"1.3\"/><circle cx=\"1.1\" cy=\"2.2\" r=\"1.3\"/>"
          + "<path class=\"husk\" d=\"M-2.4,1Q0,-.6 2.4,1L1.6,1.8Q0,.8 -1.6,1.8Z\"/></g>")));
    return parts.join("");
  },

  /** Civilization's Dawn: a laurel garland round the rim, hung with scrolls under seal. */
  civilization(path, random, cls) {
    const parts = [`<path class="sdl-garland laurel" d="${follow(path, () => 1)}"/>`];
    let side = 1;
    walk(path, random, 3, 5, s => {
      const p = point(path, s, 1);
      side = -side;
      parts.push(`<path class="sdl-leaf laurel${cls(p)}" ${place(p, side * (45 + (random() * 25)), 0.8)} d="${LAUREL}"/>`);
    });
    parts.push(hang(path, random, cls, { min: 34, max: 50, offset: 2.4, upright: true, scale: [1.1, 1.3] },
      () => "<path class=\"sdl-scroll\" d=\"M-1.6,0H1.6V5.2Q0,6.2 -1.6,5.2Z\"/>"
        + "<path class=\"sdl-scroll-line\" d=\"M-.9,1.4H.9M-.9,2.6H.9\"/><circle class=\"sdl-seal gold\" cy=\"4.4\" r=\"1.1\"/>"));
    return parts.join("");
  },

  /** The Night of Ascension, the Raven Queen's: black feathers drifting from the rim through a violet mist. */
  ascension(path, random, cls) {
    return [
      drift(path, random, cls, { min: 26, max: 40, offset: [1, 5] },
        r => `<ellipse class="sdl-mist raven" rx="${f(8 + (r() * 6))}" ry="2" ${scatter(r, 12)}/>`),
      hang(path, random, cls, { min: 7, max: 12, offset: 0.4, turn: 30, scale: [0.8, 1.1] },
        () => `<path class="sdl-feather" d="${FEATHER}"/>`),
      drift(path, random, cls, { min: 22, max: 34, offset: [8, 12] },
        r => `<g transform="rotate(${f((r() - 0.5) * 80)})"><path class="sdl-feather loose" `
          + `transform="translate(0 -4) scale(.8)" d="${FEATHER}"/></g>`)
    ].join("");
  },

  /** Zan's Cup: goblets hung on a cord, with wine dripping, and bunches of grapes between. */
  zanscup(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 26, 40, 5);
    const parts = [`<path class="sdl-cord" d="${d}"/>`];
    for ( const s of lows ) {
      const p = point(path, s, sags(s));
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.2)}><path class="sdl-goblet" `
        + "d=\"M-2,.4H2Q2,3.4 .3,4V6.2H1.4V6.8H-1.4V6.2H-.3V4Q-2,3.4 -2,.4Z\"/>"
        + `<path class="sdl-wine" d="M-1.8,1H1.8Q1.6,2.8 0,3.2Q-1.6,2.8 -1.8,1Z"/></g>`);
    }
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 0.6);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 0.9)}><g class="sdl-grapes">${[[0, 1.2], [-1.2, 2.2],
        [1.2, 2.2], [0, 3.2], [-0.6, 4.2], [0.6, 4.2], [0, 5.1]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".75"/>`)
        .join("")}</g></g>`);
    }
    parts.push(drift(path, random, cls, { min: 30, max: 46, offset: [7, 11] },
      () => `<path class="sdl-wine" transform="scale(.6)" d="${DROP}"/>`));
    return parts.join("");
  },

  /** Barren Eve: a night of mourning, with countless candles lit round the rim. */
  barreneve(path, random, cls) {
    return [
      `<path class="sdl-mourning" d="${follow(path, () => 1)}"/>`,
      drift(path, random, cls, { min: 6, max: 10, offset: [4, 11] }, r => floatingCandle(r))
    ].join("");
  },

  /** Embertide: embers glowing along the rim, and flames rising from them. */
  embertide(path, random, cls) {
    return [
      `<path class="sdl-ember-bed" d="${band(path, () => -0.4, s => 1.6 + (0.7 * Math.sin(s / 2.3)))}"/>`,
      drift(path, random, cls, { min: 5, max: 9, offset: [3, 6] },
        r => `<path class="sdl-flame c-fire" transform="scale(${f(0.55 + (r() * 0.4))}) translate(0 -2)" `
          + `${scatter(r, 3)} d="${FLAME}"/>`),
      drift(path, random, cls, { min: 6, max: 12, offset: [6, 12] },
        r => `<circle class="sdl-ember" r="${f(0.4 + (r() * 0.4))}" style="animation-delay: -${f(r() * 3)}s"/>`)
    ].join("");
  }
};
