import { f, facesDown, pick, place, point, walk } from "./trim-path.mjs";

/** @import { Outline } from "./trim-path.mjs" */

/**
 * Small pieces the trims are made from, each drawn about its own origin with "down" along +y, so that placed on an
 * outline it hangs out from the frame. Each returns SVG markup, or path data where it is named a shape. Colours are
 * named, and drawn with the class `c-<name>`, which sets the colour the piece is filled with.
 */

/* -------------------------------------------- */
/*  Shapes                                      */
/* -------------------------------------------- */

export const STAR = "M0,-2L.5,-.5L2,0L.5,.5L0,2L-.5,.5L-2,0L-.5,-.5Z";
export const BAT = "M0,0Q-1.5,-1.5 -3,-.5Q-4.5,-2 -6,-.2Q-4.5,0 -4,1.2Q-2,.4 0,1.5Q2,.4 4,1.2Q4.5,0 6,-.2Q4.5,-2 3,-.5"
  + "Q1.5,-1.5 0,0Z";
export const BROAD_LEAF = "M0,0C2.5,-3 7,-2.5 8,0C7,2.5 2.5,3 0,0Z";
export const NARROW_LEAF = "M0,0C1.2,-1.4 4,-1.4 5.5,0C4,1.4 1.2,1.4 0,0Z";
export const DROP = "M0,0C-.4,1.2 -1.6,2.4 -1.6,3.6A1.6,1.6 0 0 0 1.6,3.6C1.6,2.4 .4,1.2 0,0Z";
export const FLAME = "M0,4C-2,4 -2.4,2.2 -1.4,.8C-1.2,1.8 -.6,2 -.4,1.6C-.8,.6 -.4,-.8 .6,-2C.4,-.6 2.2,.4 1.8,2.4"
  + "C1.6,3.4 1,4 0,4Z";
export const BOLT = "M.6,0L-1.4,4.2H.2L-.8,8.4L2,3.2H.4L1.6,0Z";
export const HEART = "M0,1.2C-.6,-.4 -2.6,-.2 -2.4,1.4C-2.2,2.6 -.8,3.4 0,4.2C.8,3.4 2.2,2.6 2.4,1.4C2.6,-.2 .6,-.4 0,1.2Z";

/** A star of a number of points, its tips at a radius. */
export function starPath(points, outer, inner = outer * 0.42) {
  const corners = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i / points) - (Math.PI / 2);
    return `${f(r * Math.cos(a))},${f(r * Math.sin(a))}`;
  });
  return `M${corners.join("L")}Z`;
}

/* -------------------------------------------- */
/*  Placement                                   */
/* -------------------------------------------- */

/** The strokes runes and sigils are made from, in a small box about their middle. */
const RUNE_STROKES = ["M-1.5,-2V2", "M1.5,-2V2", "M-1.5,-2L1.5,2", "M-1.5,2L1.5,-2", "M-1.5,0H1.5", "M0,-2.5V2.5",
  "M-1.5,-2H1.5", "M-1.5,2H1.5", "M-1.5,-2L0,0L1.5,-2", "M-1.5,2L0,0L1.5,2"];

/**
 * A made-up rune of two or three strokes.
 * @param {() => number} random
 * @returns {string}  SVG path data.
 */
export function rune(random) {
  const strokes = new Set();
  const count = 2 + Math.floor(random() * 2);
  while ( strokes.size < count ) strokes.add(pick(random, RUNE_STROKES));
  return [...strokes].join("");
}

/**
 * A piece that drifts on its own in screen space, unturned by the outline: a mote, an ember, a snowflake.
 * @param {{x: number, y: number}} p
 * @param {string} inner  The piece, drawn about its own middle.
 * @returns {string}
 */
export function loose(p, inner) {
  return `<g transform="translate(${f(p.x)} ${f(p.y)})">${inner}</g>`;
}

/**
 * Animation timing to scatter pieces that move alike.
 * @param {() => number} random
 * @param {number} period  The animation's length, in seconds.
 * @returns {string}
 */
export function scatter(random, period) {
  return `style="animation-delay: -${f(random() * period)}s"`;
}

/**
 * Pieces hung at uneven steps along an outline, each turned to face out from it.
 * @param {Outline} path
 * @param {() => number} random
 * @param {(p: object) => string} cls  The trim's class for a piece at a point.
 * @param {object} options
 * @param {number} options.min        The shortest step.
 * @param {number} options.max        The longest step.
 * @param {number|((s: number) => number)} [options.offset=0]  How far out from the outline.
 * @param {number} [options.turn=0]   How far each piece may be turned either way, in degrees.
 * @param {number[]} [options.scale]  The smallest and largest size.
 * @param {boolean} [options.upright] Hang straight down where the outline faces down, rather than square to it.
 * @param {number} [options.down]     Leave out pieces where the outline faces down less than this, from 0 to 1.
 * @param {(random: () => number, i: number, s: number) => string} piece  The piece, drawn about its origin.
 * @returns {string}
 */
export function hang(path, random, cls, { min, max, offset = 0, turn = 0, scale = [1, 1], upright, down }, piece) {
  const parts = [];
  let i = 0;
  walk(path, random, min, max, s => {
    if ( (down !== undefined) && (facesDown(path, s) < down) ) return;
    const p = point(path, s, typeof offset === "function" ? offset(s) : offset);
    if ( upright && (facesDown(path, s) > 0.5) ) p.deg = 0;
    const size = scale[0] + (random() * (scale[1] - scale[0]));
    const inner = piece(random, i++, s);
    if ( inner ) parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, (random() - 0.5) * 2 * turn, size)}>${inner}</g>`);
  });
  return parts.join("");
}

/**
 * Pieces drifting loose off an outline, unturned, as motes, embers or bubbles.
 * @param {Outline} path
 * @param {() => number} random
 * @param {(p: object) => string} cls
 * @param {object} options
 * @param {number} options.min      The shortest step.
 * @param {number} options.max      The longest step.
 * @param {number[]} options.offset  The nearest and furthest out from the outline.
 * @param {(random: () => number, i: number) => string} piece
 * @returns {string}
 */
export function drift(path, random, cls, { min, max, offset }, piece) {
  const parts = [];
  let i = 0;
  walk(path, random, min, max, s => {
    const p = point(path, s, offset[0] + (random() * (offset[1] - offset[0])));
    parts.push(`<g class="sdl-piece${cls(p)}" transform="translate(${f(p.x)} ${f(p.y)})">${piece(random, i++)}</g>`);
  });
  return parts.join("");
}

/* -------------------------------------------- */
/*  Pieces                                      */
/* -------------------------------------------- */

/** A coin, seen face on. */
export const coin = (kind = "gold") => `<g class="sdl-coin c-${kind}"><circle r="2.1"/><circle class="rim" r="1.4"/></g>`;

/** A cut gem, its colour a class. */
export const gem = colour => `<path class="sdl-jewel c-${colour}" d="M-1.8,0L-1,-1.2H1L1.8,0L0,2.6Z"/>`
  + "<path class=\"sdl-jewel-shine\" d=\"M-.6,-.6L-.2,.6\"/>";

/** A flame standing on its base, about its own middle. */
export const flame = kind => `<path class="sdl-flame c-${kind ?? "fire"}" transform="translate(0 -2)" d="${FLAME}"/>`;

/** A closed book, its spine to the frame, in a colour. */
export const book = colour => `<g class="sdl-book c-${colour}"><rect x="-1.6" y="0" width="3.2" height="4.6" rx=".3"/>`
  + "<path class=\"band\" d=\"M-1.6,1H1.6M-1.6,3.6H1.6\"/></g>";

/** A candle standing on its base, burning towards the frame: upright, along the bar's lower edge. */
export const candle = (height = 4) => `<g class="sdl-candle"><rect class="wax" x="-.9" y="${f(-height)}" width="1.8" `
  + `height="${f(height)}"/><path class="sdl-flame small" transform="translate(0 ${f(-height - 1.8)}) scale(.45)" `
  + `d="${FLAME}"/></g>`;

/** A key, hanging bow down. */
export const key = () => "<g class=\"sdl-key\"><path d=\"M0,0V5M0,2.2H1.2M0,3.4H.9\"/><circle cy=\"6.4\" r=\"1.4\"/></g>";

/** A lantern on a short chain. */
export const lantern = () => "<g class=\"sdl-lamp\"><path class=\"chain\" d=\"M0,0V2\"/>"
  + "<path class=\"cage\" d=\"M-1.4,2H1.4L1.8,3V6.4L1.4,7.2H-1.4L-1.8,6.4V3Z\"/>"
  + "<rect class=\"light\" x=\"-1\" y=\"3\" width=\"2\" height=\"3.4\"/></g>";

/** A disc of a moon, its lit colour a class. */
export const moon = colour => `<g class="sdl-orb c-${colour}"><circle r="2.4"/><circle class="shade" cx=".7" cy="-.6" r="1.8"/></g>`;

/** A puff of cloud, about its middle. */
export const cloud = () => "<path class=\"sdl-cloud\" d=\"M-5,1.5A1.8,1.8 0 0 1 -3.6,-1A2.4,2.4 0 0 1 .6,-2"
  + "A2,2 0 0 1 4,-.4A1.6,1.6 0 0 1 5,1.5Z\"/>";

/** A small planet, perhaps with a ring. */
export const planet = (colour, ringed) => `<g class="sdl-planet c-${colour}"><circle r="2.6"/>`
  + `${ringed ? "<ellipse class=\"ring\" rx=\"4.2\" ry=\"1.1\" transform=\"rotate(-18)\"/>" : ""}</g>`;

/** A playing card, hanging by a corner, with a mark on its face. */
export const card = mark => "<g class=\"sdl-card\"><rect x=\"-2\" y=\"0\" width=\"4\" height=\"5.6\" rx=\".5\"/>"
  + `<path class="mark" transform="translate(0 2.8) scale(.55)" d="${mark}"/></g>`;

/** A stone, uneven, about its middle. */
export const stone = random => {
  const corners = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    const r = 1.6 + (random() * 1.1);
    return `${f(r * Math.cos(a))},${f(r * Math.sin(a))}`;
  });
  return `<path class="sdl-stone" d="M${corners.join("L")}Z"/>`;
};

/** A pennant, hanging point down, in two colours. */
export const pennant = (a, b) => `<g class="sdl-pennant"><path class="c-${a}" d="M-2.2,0H2.2L0,7Z"/>`
  + `<path class="c-${b}" d="M-2.2,0H0L0,7Z"/></g>`;

/** A shell, a scallop, opening downwards. */
export const shell = () => "<g class=\"sdl-shell\"><path d=\"M0,0L-2.6,3.2A3,2.4 0 0 0 2.6,3.2Z\"/>"
  + "<path class=\"ribs\" d=\"M0,0L-1.4,4.2M0,0V4.5M0,0L1.4,4.2\"/></g>";

/** A crystal, pointing out from the frame. */
export const crystal = (length, kind) => `<g class="sdl-crystal c-${kind}">`
  + `<path d="M-1.3,0L-1.1,${f(length * 0.75)}L0,${f(length)}L1.1,${f(length * 0.75)}L1.3,0Z"/>`
  + `<path class="facet" d="M0,0V${f(length)}"/></g>`;

/** A drip, hanging from the frame. */
export const drip = (length, kind) => `<path class="sdl-drip c-${kind}" `
  + `d="M-1,0C-.6,${f(length * 0.5)} -.9,${f(length)} 0,${f(length + 1)}C.9,${f(length)} .6,${f(length * 0.5)} 1,0Z"/>`;

/** A bubble, about its middle. */
export const bubble = r => `<circle class="sdl-bubble" r="${f(r)}"/>`;

/** A flower of round petals, about its middle, its colour a class. */
export const flower = (petals, colour, size = 1.6) => `<g class="sdl-bloom c-${colour}">${Array.from({ length: petals }, (_, i) => {
  const a = (i * 2 * Math.PI) / petals;
  return `<circle cx="${f(size * 1.1 * Math.cos(a))}" cy="${f(size * 1.1 * Math.sin(a))}" r="${f(size)}"/>`;
}).join("")}<circle class="heart" r="${f(size * 0.7)}"/></g>`;
