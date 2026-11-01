import { BOLT, book, bubble, candle, cloud, coin, drift, drip, DROP, flame, flower, gem, HEART, hang, key, lantern, rune,
  scatter, shell, STAR, starPath, stone } from "./trim-motifs.mjs";
import { band, f, facesDown, follow, pick, place, point, swags, walk } from "./trim-path.mjs";

/**
 * More adventures' trim, for the rest of D&D's published adventures, anthologies and starter sets, drawn and chosen
 * like the first.
 */

/** A crescent, its horns pointing away from the frame. */
const CRESCENT = "M-2.4,0A2.6,2.6 0 1 0 2.4,0A2.1,2.1 0 1 1 -2.4,0Z";

/** A cog of a number of teeth, about its middle. */
function gearPath(teeth, r) {
  const points = [];
  for ( let i = 0; i < teeth * 4; i++ ) {
    const a = (i * Math.PI * 2) / (teeth * 4);
    const radius = (i % 4 < 2) ? r : r * 0.75;
    points.push(`${f(radius * Math.cos(a))},${f(radius * Math.sin(a))}`);
  }
  return `M${points.join("L")}ZM${f(r * 0.3)},0A${f(r * 0.3)},${f(r * 0.3)} 0 1 0 ${f(-r * 0.3)},0A${f(r * 0.3)},`
    + `${f(r * 0.3)} 0 1 0 ${f(r * 0.3)},0Z`;
}

/** Waves curling along an outline, as a filled band. */
function waves(path, random, depth, from = -0.4) {
  const phase = random() * 10;
  return `<path class="sdl-waves" d="${band(path, () => from, s => depth + (0.9 * Math.sin((s / 3.2) + phase)))}"/>`
    + `<path class="sdl-wave-crest" d="${follow(path, s => depth + (0.9 * Math.sin((s / 3.2) + phase)))}"/>`;
}

/** Dragons' colours, chromatic and metallic. */
const CHROMATIC = ["white", "black", "green", "blue", "red"];

export const CAMPAIGNS = {
  /** Lost Mine of Phandelver: a mine's rails along the edge, pickaxes and lanterns, and Wave Echo Cave's green glow. */
  phandelver(path, random, cls) {
    const parts = [`<path class="sdl-rail-track" d="${follow(path, () => 2.6)}"/>`,
      `<path class="sdl-rail-track" d="${follow(path, () => 5.6)}"/>`];
    for ( let s = 2; s < path.length - 2; s += 4.5 ) {
      const p = point(path, s, 4.1);
      parts.push(`<rect class="sdl-sleeper${cls(p)}" x="-.6" y="-2.2" width="1.2" height="4.4" ${place(p)}/>`);
    }
    parts.push(hang(path, random, cls, { min: 40, max: 64, offset: 6.4, upright: true, down: 0.5, scale: [1.5, 1.8] },
      (r, i) => (i % 2 ? lantern() : "<g transform=\"rotate(-35)\"><path class=\"sdl-pick-handle\" d=\"M0,0V8\"/>"
        + "<path class=\"sdl-pick-head\" d=\"M-3.8,1.6Q0,-.8 3.8,1.6L3.4,.2Q0,-1.6 -3.4,.2Z\"/></g>")));
    parts.push(drift(path, random, cls, { min: 18, max: 30, offset: [5, 13] },
      r => `<circle class="sdl-mote c-wave" r="${f(0.4 + (r() * 0.5))}" ${scatter(r, 4)}/>`));
    return parts.join("");
  },

  /** Hoard of the Dragon Queen: the Cult of the Dragon's purple in swags, with dragon eggs and spilled coins. */
  dragonqueen(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 36, 56, 7);
    const parts = [`<path class="sdl-cult-cloth" d="${d}"/>`];
    lows.forEach((s, i) => {
      const p = point(path, s, sags(s) + 1);
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.6)}><g class="sdl-egg c-${CHROMATIC[i % 5]}">`
        + "<ellipse cy=\"3\" rx=\"2.2\" ry=\"3\"/><circle class=\"speck\" cx=\"-.7\" cy=\"2.2\" r=\".4\"/>"
        + "<circle class=\"speck\" cx=\".8\" cy=\"3.6\" r=\".35\"/><circle class=\"speck\" cx=\"-.2\" cy=\"4.6\" r=\".3\"/></g></g>");
    });
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 2.4);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.3)}>${coin()}</g>`);
    }
    return parts.join("");
  },

  /** The Rise of Tiamat: scales in the five colours of the Dragon Queen's heads, and claws hooked over the edge. */
  tiamat(path, random, cls) {
    const parts = [];
    for ( let s = 1.5, i = 0; s < path.length - 1; s += 3, i++ ) {
      for ( const [row, shift] of [[0.2, 0], [2.2, 1.5]] ) {
        const p = point(path, s + shift, row);
        parts.push(`<path class="sdl-scale c-${CHROMATIC[Math.floor(i / 6) % 5]}${cls(p)}" ${place(p)} `
          + "d=\"M-1.6,0A1.6,2.2 0 0 0 1.6,0Z\"/>");
      }
    }
    parts.push(hang(path, random, cls, { min: 60, max: 90, offset: 3.6, scale: [1.3, 1.6] },
      () => "<path class=\"sdl-talon\" d=\"M-2.4,0Q-2.6,4 -.6,6Q-1.2,3 -.4,0ZM.4,0Q1.2,3.6 2.4,5.4Q2.2,2.4 2,0Z\"/>"));
    return parts.join("");
  },

  /** Princes of the Apocalypse: the four elements in turn, air, earth, fire and water. */
  elemental(path, random, cls) {
    const pieces = [
      () => "<path class=\"sdl-air\" d=\"M-2.6,1A2.4,2.4 0 1 1 1,3.4A1.4,1.4 0 1 1 -.4,1.8\"/>",
      r => stone(r),
      () => flame(),
      () => `<path class="sdl-water" transform="translate(0 -1.4)" d="${DROP}"/>`
    ];
    return [
      `<path class="sdl-element-line" d="${follow(path, () => 1)}"/>`,
      hang(path, random, cls, { min: 14, max: 20, offset: 4.4, upright: true, scale: [1.3, 1.5] },
        (r, i) => pieces[i % 4](r))
    ].join("");
  },

  /** Out of the Abyss: the Underdark's stalactites, glowing fungus, and the violet motes of faerzress. */
  underdark(path, random, cls) {
    return [
      `<path class="sdl-cave-rock" d="${band(path, () => -0.5, s => 1.6 + (0.8 * Math.sin(s / 3.1)))}"/>`,
      hang(path, random, cls, { min: 6, max: 13, offset: 1.4, upright: true, down: 0.3, scale: [0.8, 1.3] }, r => {
        const length = 4 + (r() * 9);
        return `<path class="sdl-stalactite" d="M-1.4,0L0,${f(length)}L1.4,0Z"/>`;
      }),
      hang(path, random, cls, { min: 22, max: 36, offset: 1.8, scale: [1, 1.4] },
        r => `<g class="sdl-fungus c-${pick(r, ["teal", "violet"])}"><path class="cap" d="M-2.6,0A2.6,2 0 0 0 2.6,0Z"/>`
          + "<circle class=\"dot\" cx=\"-1\" cy=\"1\" r=\".35\"/><circle class=\"dot\" cx=\".9\" cy=\".8\" r=\".3\"/></g>"),
      drift(path, random, cls, { min: 12, max: 22, offset: [4, 14] },
        r => `<circle class="sdl-mote c-faerzress" r="${f(0.4 + (r() * 0.5))}" ${scatter(r, 4)}/>`)
    ].join("");
  },

  /** Storm King's Thunder: storm clouds along the edge, lightning out of them, and driving rain. */
  giants(path, random, cls) {
    return [
      hang(path, random, cls, { min: 9, max: 14, offset: 2.6, turn: 6, scale: [1.3, 1.7] }, () => cloud()),
      hang(path, random, cls, { min: 50, max: 80, offset: 3, upright: true, down: 0.5, scale: [1.2, 1.5] },
        r => `<path class="sdl-bolt" ${scatter(r, 6)} d="${BOLT}"/>`),
      drift(path, random, cls, { min: 6, max: 12, offset: [5, 14] },
        r => `<path class="sdl-rain" d="M0,0L-.8,2.6" ${scatter(r, 1.2)}/>`)
    ].join("");
  },

  /**
   * Tales from the Yawning Portal: the taproom's iron-strapped beam, with rope swagged along it and tankards and
   * lanterns hung from it; a winch at each end lowering a bucket into the well; and eyes in the dark of Undermountain.
   */
  yawningportal(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 26, 40, 5);
    const winches = [110, 490].map(x => x - 40 + (39 * Math.PI / 2));
    const clear = s => winches.every(w => Math.abs(s - w) > 10);
    const parts = [`<path class="sdl-beam" d="${band(path, () => -0.5, () => 4.2)}"/>`,
      `<path class="sdl-beam-grain" d="${follow(path, () => 1.4)}"/>`,
      `<path class="sdl-beam-grain" d="${follow(path, () => 2.9)}"/>`];
    for ( let s = 16; s < path.length - 8; s += 34 ) {
      const p = point(path, s, 1.8);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p)}><rect class="sdl-strap" x="-1.3" y="-2.3" width="2.6" `
        + "height=\"4.6\"/><circle class=\"sdl-bolt-head\" cy=\"-1\" r=\".45\"/><circle class=\"sdl-bolt-head\" cy=\"1\" r=\".45\"/></g>");
    }
    parts.push(`<path class="sdl-rope" d="${d}"/>`);
    pins.slice(1, -1).forEach((s, i) => {
      if ( (facesDown(path, s) < 0.5) || !clear(s) ) return;
      const p = { ...point(path, s, 4.2), deg: 0 };
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 2.2)}>${i % 3 === 1 ? lantern()
        : "<path class=\"sdl-hook\" d=\"M0,0V1.4\"/><g class=\"sdl-tankard\">"
          + "<rect class=\"body\" x=\"-1.7\" y=\"1.6\" width=\"3.4\" height=\"4.2\" rx=\".4\"/>"
          + "<path class=\"hoop\" d=\"M-1.7,2.8H1.7M-1.7,4.6H1.7\"/><path class=\"handle\" d=\"M1.7,2.4H2.8V4.8H1.7\"/>"
          + "<path class=\"foam\" d=\"M-2,2Q-1.2,.6 0,1.2Q1.2,.6 2,2V2.4H.9V3.4Q.6,3.9 .3,3.4V2.4H-2Z\"/></g>"}</g>`);
    });
    for ( const s of lows ) {
      const p = point(path, s, sags(s) + 15 + (random() * 4));
      if ( (random() < 0.5) || (facesDown(path, s) < 0.8) ) continue;
      parts.push(`<g class="sdl-piece${cls(p)}" transform="translate(${f(p.x)} ${f(p.y)})"><g class="sdl-lurker" `
        + `${scatter(random, 7)}><ellipse cx="-1.5" rx=".9" ry=".6"/><ellipse cx="1.5" rx=".9" ry=".6"/></g></g>`);
    }
    for ( const s of winches ) {
      const p = { ...point(path, s, 4.2), deg: 0 };
      const length = 8 + (random() * 2);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 2.1)}><g class="sdl-winch">`
        + "<path class=\"bracket\" d=\"M-1.6,0L0,2.6L1.6,0\"/><circle class=\"wheel\" cy=\"2.6\" r=\"2.2\"/>"
        + "<path class=\"spokes\" d=\"M0,.4V4.8M-2.2,2.6H2.2\"/></g>"
        + `<g class="sdl-sway" ${scatter(random, 6)}><path class="sdl-rope line" d="M2.2,2.6V${f(length)}"/>`
        + `<g transform="translate(2.2 ${f(length)})"><path class="sdl-bucket" d="M-2,0H2L1.5,3.2H-1.5Z"/>`
        + "<path class=\"sdl-bucket-band\" d=\"M-1.8,1H1.8M-1.6,2.2H1.6\"/><path class=\"sdl-bucket-handle\" d=\"M-2,0Q0,-2 2,0\"/>"
        + "</g></g></g>");
    }
    return parts.join("");
  },

  /** Waterdeep: Dragon Heist: a velvet swag, hung with masks of the Masked Lords, and gold dragons. */
  dragonheist(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 34, 52, 6);
    const parts = [`<path class="sdl-velvet" d="${d}"/>`];
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 1);
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.6)}><path class="sdl-mask" `
        + "d=\"M-3.4,1.4Q-3.4,.4 -2,.4H2Q3.4,.4 3.4,1.4Q3.2,3.6 1.2,3.6Q.4,3.6 0,2.6Q-.4,3.6 -1.2,3.6Q-3.2,3.6 -3.4,1.4Z\"/>"
        + "<ellipse class=\"sdl-mask-eye\" cx=\"-1.5\" cy=\"2\" rx=\".9\" ry=\".55\"/>"
        + "<ellipse class=\"sdl-mask-eye\" cx=\"1.5\" cy=\"2\" rx=\".9\" ry=\".55\"/></g>");
    }
    for ( const s of lows ) {
      const p = point(path, s, sags(s) + 2.6);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.4)}>${coin()}</g>`);
    }
    return parts.join("");
  },

  /** Dungeon of the Mad Mage: Undermountain's brick, Halaster's rune-ringed gates, and stray arcane motes. */
  madmage(path, random, cls) {
    const parts = [`<path class="sdl-brick" d="${band(path, () => -0.5, () => 4.2)}"/>`];
    for ( let s = 1, i = 0; s < path.length; s += 5, i++ ) {
      const p = point(path, s + (i % 2 ? 2.5 : 0), 2);
      parts.push(`<path class="sdl-mortar${cls(p)}" ${place(p)} d="M-2.5,-2V2"/>`);
    }
    parts.push(`<path class="sdl-mortar" d="${follow(path, () => 2)}"/>`);
    parts.push(hang(path, random, cls, { min: 60, max: 90, offset: 8.4, scale: [1.3, 1.5] },
      r => `<g class="sdl-spin" ${scatter(r, 20)}><circle class="sdl-gate" r="3.6"/>`
        + `${[0, 1, 2, 3, 4, 5].map(i => {
          const a = (i * Math.PI) / 3;
          return `<path class="sdl-gate-rune" transform="translate(${f(2.4 * Math.cos(a))} ${f(2.4 * Math.sin(a))}) `
            + `scale(.25)" d="${rune(r)}"/>`;
        }).join("")}</g>`));
    parts.push(drift(path, random, cls, { min: 18, max: 30, offset: [5, 14] },
      r => `<circle class="sdl-mote c-violet" r="${f(0.4 + (r() * 0.5))}" ${scatter(r, 4)}/>`));
    return parts.join("");
  },

  /** Ghosts of Saltmarsh: waves along the edge, a fishing net in swags, and shells caught in it. */
  saltmarsh(path, random, cls) {
    const { d, pins, sags } = swags(path, random, 26, 40, 7);
    const parts = [waves(path, random, 2.4), `<path class="sdl-net" d="${d}"/>`];
    for ( let i = 1; i < pins.length; i++ ) {
      for ( let s = pins[i - 1] + 3; s < pins[i] - 2; s += 3 ) {
        const a = point(path, s, 2.4);
        const b = point(path, s + 1.5, sags(s + 1.5));
        parts.push(`<path class="sdl-net" d="M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}"/>`);
      }
    }
    parts.push(hang(path, random, cls, { min: 26, max: 44, offset: 5, scale: [1.2, 1.5], turn: 15 }, () => shell()));
    return parts.join("");
  },

  /** Dragon of Icespire Peak: snow-capped peaks hung along the edge, the white dragon wheeling, and falling snow. */
  icespire(path, random, cls) {
    const parts = [];
    walk(path, random, 7, 12, s => {
      const h = 6 + (random() * 8);
      const p = point(path, s, 0.5);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p)}><path class="sdl-peak" d="M-5,0L0,${f(h)}L5,0Z"/>`
        + `<path class="sdl-peak-snow" d="M-1.4,${f(h * 0.62)}L0,${f(h)}L1.4,${f(h * 0.62)}Z"/></g>`);
    });
    parts.push(hang(path, random, cls, { min: 110, max: 160, offset: 17, upright: true, scale: [1.9, 2.2] },
      () => "<path class=\"sdl-wyrm\" d=\"M-5,0Q-2.4,-2.6 0,0Q2.4,-2.6 5,0Q2.4,-.8 1,.6L.4,2L0,3.6L-.4,2L-1,.6Q-2.4,-.8 -5,0Z\"/>"));
    parts.push(drift(path, random, cls, { min: 16, max: 28, offset: [4, 14] },
      r => `<path class="sdl-flake" d="M0,-1.8V1.8M-1.6,-.9L1.6,.9M-1.6,.9L1.6,-.9" ${scatter(r, 6)}/>`));
    return parts.join("");
  },

  /** Candlekeep Mysteries: a shelf under the edge, its books standing in a row, and candles among them. */
  candlekeep(path, random, cls) {
    const colours = ["red", "blue", "green", "bronze", "violet", "black"];
    const shelf = 12;
    const parts = [`<path class="sdl-shelf" d="${band(path, () => shelf, () => shelf + 1.2)}"/>`];
    walk(path, random, 5, 6.4, s => {
      const p = point(path, s, shelf);
      if ( facesDown(path, s) > 0.6 ) p.deg = 0;
      if ( random() < 0.12 ) parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.6)}>${candle(4.4)}</g>`);
      else {
        const h = 7 + (random() * 3);
        parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, (random() - 0.5) * 8)}><g transform="translate(0 ${f(-h)}) `
          + `scale(1.35 ${f(h / 4.6)})">${book(pick(random, colours))}</g></g>`);
      }
    });
    return parts.join("");
  },

  /** Journeys through the Radiant Citadel: concord jewels of every colour on a gold chain, shining. */
  radiantcitadel(path, random, cls) {
    const colours = ["red", "orange", "gold", "green", "teal", "blue", "violet", "pink"];
    const { d, pins, lows, sags } = swags(path, random, 22, 34, 4);
    const parts = [`<path class="sdl-gold-cord" d="${d}"/>`];
    lows.forEach((s, i) => {
      const p = point(path, s, sags(s) + 0.6);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.8)}><path class="sdl-gem-ray" d="M0,1L0,-1.4M-1.6,1.4L-2.8,.2`
        + `M1.6,1.4L2.8,.2" transform="translate(0 2)"/>${gem(colours[i % colours.length])}</g>`);
    });
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 0.8);
      parts.push(`<path class="sdl-sparkle radiant${cls(p)}" ${place(p, 45, 0.7)} ${scatter(random, 4)} d="${STAR}"/>`);
    }
    return parts.join("");
  },

  /** Dragons of Stormwreck Isle: a wreck's broken timbers, the sea beneath, and lightning over it. */
  stormwreck(path, random, cls) {
    const parts = [waves(path, random, 9, 4)];
    walk(path, random, 9, 16, s => {
      const p = point(path, s, 0.8);
      const w = 5 + (random() * 5);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, (random() - 0.5) * 24)}><path class="sdl-plank" `
        + `d="M${f(-w / 2)},0H${f(w / 2)}L${f((w / 2) - 0.6)},2.2L${f((w / 2) - 1.6)},1.6L${f(-w / 2)},2.4Z"/></g>`);
    });
    parts.push(hang(path, random, cls, { min: 70, max: 110, offset: 4, upright: true, down: 0.6, scale: [1.3, 1.5] },
      r => `<path class="sdl-bolt" ${scatter(r, 6)} d="${BOLT}"/>`));
    return parts.join("");
  },

  /** Keys from the Golden Vault: a gold chain hung with keys, and gold bars and coins between them. */
  goldenvault(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 26, 40, 5);
    const parts = [`<path class="sdl-brass-chain" d="${d}"/>`];
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 0.4);
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, (random() - 0.5) * 16, 1.5)}>${key()}</g>`);
    }
    lows.forEach((s, i) => {
      const p = point(path, s, sags(s) + 2.4);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, 0, 1.4)}>${i % 2 ? coin()
        : "<path class=\"sdl-ingot\" d=\"M-2.6,1.4L-1.8,-.6H1.8L2.6,1.4Z\"/>"}</g>`);
    });
    return parts.join("");
  },

  /** Quests from the Infinite Staircase: a stair climbing along the edge, and doors to other worlds off it. */
  staircase(path, random, cls) {
    const colours = ["teal", "violet", "orange", "green", "blue", "red"];
    const step = s => 1 + (Math.floor((s % 24) / 4) * 0.6);
    const parts = [`<path class="sdl-stair" d="${band(path, () => -0.5, step)}"/>`];
    parts.push(hang(path, random, cls, { min: 40, max: 64, offset: s => step(s) + 0.2, upright: true, down: 0.6,
      scale: [1.3, 1.6] }, (r, i) => `<g class="sdl-door c-${colours[i % colours.length]}"><path class="frame" `
      + "d=\"M-2.4,7.4V2.4A2.4,2.4 0 0 1 2.4,2.4V7.4Z\"/><path class=\"leaf\" d=\"M-1.7,7.4V2.6A1.7,1.7 0 0 1 1.7,2.6V7.4Z\"/>"
      + "<circle class=\"knob\" cx=\"1\" cy=\"5\" r=\".3\"/></g>"));
    parts.push(drift(path, random, cls, { min: 24, max: 40, offset: [6, 14] },
      r => `<path class="sdl-sparkle arcane" transform="scale(${f(0.5 + (r() * 0.4))})" ${scatter(r, 4)} d="${STAR}"/>`));
    return parts.join("");
  },

  /** Heroes of the Borderlands: the Keep's palisade of sharpened stakes, with round shields hung on it. */
  borderlands(path, random, cls) {
    const parts = [`<path class="sdl-palisade-rail" d="${follow(path, () => 2)}"/>`];
    for ( let s = 1.2; s < path.length - 1; s += 2.6 ) {
      const p = point(path, s, -0.4);
      const length = 5 + ((s * 7.3) % 2.4);
      parts.push(`<path class="sdl-stake${cls(p)}" ${place(p)} d="M-1.1,0V${f(length - 1.6)}L0,${f(length)}L1.1,`
        + `${f(length - 1.6)}V0Z"/>`);
    }
    parts.push(hang(path, random, cls, { min: 40, max: 64, offset: 2.4, upright: true, down: 0.5, scale: [1.4, 1.6] },
      (r, i) => `<g class="sdl-buckler c-${["red", "blue", "green"][i % 3]}"><circle cy="3" r="2.6"/>`
        + "<circle class=\"boss\" cy=\"3\" r=\".7\"/></g>"));
    return parts.join("");
  },

  /** Hold Back the Dead: a grave's mist along the edge, and the dead's hands reaching out of it. */
  holdbackdead(path, random, cls) {
    return [
      drift(path, random, cls, { min: 26, max: 44, offset: [2, 6] },
        r => `<ellipse class="sdl-mist grave" rx="${f(8 + (r() * 6))}" ry="2.2" ${scatter(r, 12)}/>`),
      hang(path, random, cls, { min: 22, max: 40, offset: 0.4, turn: 18, scale: [1.2, 1.6] },
        () => "<path class=\"sdl-hand\" d=\"M-1.6,0V3.6L-2.6,4.6V7.4H-2V5.2L-1.4,5V8.4H-.8V5L-.2,5V8.8H.4V5L1,5V8.2H1.6V5"
          + "L2,4.6L2.6,6H3.2L2.6,3.8L1.6,3V0Z\"/>"),
      drift(path, random, cls, { min: 16, max: 26, offset: [6, 14] },
        r => `<circle class="sdl-mote c-grave" r="${f(0.4 + (r() * 0.5))}" ${scatter(r, 4)}/>`)
    ].join("");
  },

  /** Scions of Elemental Evil: the Temple's cracked stone, and the alchemists' signs of the four elements, burning. */
  scions(path, random, cls) {
    const signs = ["M0,-2.6L2.4,1.6H-2.4Z", "M0,2.6L2.4,-1.6H-2.4Z", "M0,-2.6L2.4,1.6H-2.4ZM-1.8,.2H1.8",
      "M0,2.6L2.4,-1.6H-2.4ZM-1.8,-.2H1.8"];
    const colours = ["fire", "water", "air", "earth"];
    const parts = [`<path class="sdl-temple-stone" d="${band(path, () => -0.5, () => 3)}"/>`];
    walk(path, random, 14, 30, s => {
      const p = point(path, s, 1.5);
      parts.push(`<path class="sdl-crack${cls(p)}" ${place(p, (random() - 0.5) * 40)} d="M0,-1.5L.6,0L-.4,.8L.2,1.5"/>`);
    });
    parts.push(hang(path, random, cls, { min: 30, max: 46, offset: 6.6, scale: [1.4, 1.6] },
      (r, i) => `<path class="sdl-sign c-${colours[i % 4]}" ${scatter(r, 5)} d="${signs[i % 4]}"/>`));
    return parts.join("");
  },

  /** Uni and the Hunt for the Lost Horn: a rainbow along the edge, flowers, hearts and sparkles. */
  unicorn(path, random, cls) {
    const stripes = ["red", "orange", "sun", "green", "blue", "violet"];
    const parts = stripes.map((c, i) => `<path class="sdl-rainbow c-${c}" d="${follow(path, () => 0.6 + (i * 0.9))}"/>`);
    parts.push(hang(path, random, cls, { min: 20, max: 34, offset: 7, turn: 30, scale: [1, 1.3] },
      (r, i) => (i % 3 === 2 ? `<path class="sdl-heart" d="${HEART}"/>`
        : flower(5, pick(r, ["pink", "white", "sun"]), 1.2))));
    parts.push(drift(path, random, cls, { min: 14, max: 24, offset: [8, 15] },
      r => `<path class="sdl-sparkle" transform="scale(${f(0.5 + (r() * 0.4))})" ${scatter(r, 4)} d="${STAR}"/>`));
    return parts.join("");
  },

  /** The Book of Many Things: the Deck's cards on a purple cord, each with its mark, and stars between. */
  manythings(path, random, cls) {
    const marks = [STAR, CRESCENT, "M0,-2.4A2.4,2.4 0 1 0 0,2.4A2.4,2.4 0 1 0 0,-2.4Z", starPath(5, 2.6), HEART];
    const { d, pins } = swags(path, random, 20, 30, 3);
    const parts = [`<path class="sdl-deck-cord" d="${d}"/>`];
    pins.slice(1, -1).forEach((s, i) => {
      const p = point(path, s, 0.4);
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, (random() - 0.5) * 24, 1.6)}><g class="sdl-card">`
        + `<rect x="-2" y="0" width="4" height="5.6" rx=".5"/><path class="mark" transform="translate(0 2.8) scale(.55)" `
        + `d="${marks[i % marks.length]}"/></g></g>`);
    });
    parts.push(drift(path, random, cls, { min: 22, max: 36, offset: [10, 15] },
      r => `<path class="sdl-sparkle arcane" transform="scale(${f(0.5 + (r() * 0.4))})" ${scatter(r, 4)} d="${STAR}"/>`));
    return parts.join("");
  },

  /** Bigby Presents: Glory of the Giants: stone tablets carved with giant runes, glowing frost and fire. */
  glory(path, random, cls) {
    return [
      `<path class="sdl-temple-stone" d="${band(path, () => -0.5, () => 1.8)}"/>`,
      hang(path, random, cls, { min: 26, max: 38, offset: 1.6, upright: true, down: 0.4, scale: [1.9, 2.2] },
        (r, i) => "<path class=\"sdl-tablet\" d=\"M-2.6,0H2.6V5.6Q0,6.6 -2.6,5.6Z\"/>"
          + `<path class="sdl-rune ${i % 2 ? "fire" : "frost"}" transform="translate(0 2.9) scale(.7)" ${scatter(r, 5)} `
          + `d="${rune(r)}"/>`),
      drift(path, random, cls, { min: 20, max: 34, offset: [8, 14] },
        (r, i) => `<circle class="sdl-mote c-${i % 2 ? "fire" : "frost"}" r="${f(0.4 + (r() * 0.4))}" ${scatter(r, 4)}/>`)
    ].join("");
  },

  /** Astarion's Book of Hungers: crimson silk in swags, dark roses at its pins, and blood dripping from it. */
  astarion(path, random, cls) {
    const { d, pins, lows, sags } = swags(path, random, 30, 46, 6);
    const parts = [`<path class="sdl-silk" d="${d}"/>`];
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 1);
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p, random() * 60, 1.5)}><g class="sdl-rose">`
        + "<circle r=\"2.2\"/><path class=\"curl\" d=\"M-1.2,-.4A1.2,1.2 0 1 1 .6,1A.7,.7 0 1 1 -.2,.2\"/></g></g>");
    }
    lows.forEach(s => {
      const p = point(path, s, sags(s));
      if ( facesDown(path, s) > 0.5 ) p.deg = 0;
      parts.push(`<g class="sdl-piece${cls(p)}" ${place(p)}>${drip(3 + (random() * 5), "blood")}</g>`);
    });
    return parts.join("");
  },

  /** Locathah Rising: kelp swaying from the edge, coral, and bubbles rising. */
  locathah(path, random, cls) {
    return [
      hang(path, random, cls, { min: 7, max: 13, offset: 0.4, upright: true, down: 0.3, scale: [0.9, 1.3] }, r => {
        const length = 7 + (r() * 9);
        const sway = 1.2 + (r() * 1.4);
        return `<path class="sdl-kelp" d="M0,0C${f(sway)},${f(length * 0.3)} ${f(-sway)},${f(length * 0.6)} `
          + `${f(sway * 0.5)},${f(length)}"/>`;
      }),
      hang(path, random, cls, { min: 34, max: 54, offset: 0.6, upright: true, down: 0.5, scale: [1.2, 1.5] },
        r => `<path class="sdl-coral c-${pick(r, ["pink", "orange"])}" `
          + "d=\"M0,0V5M0,2L-2,4V5.6M0,3L2.2,4.8V6.2M-2,4L-3,4.6M2.2,4.8L3,4.2\"/>"),
      drift(path, random, cls, { min: 10, max: 18, offset: [3, 14] }, r => bubble(0.6 + (r() * 0.8)))
    ].join("");
  },

  /** The Lost Laboratory of Kwalish: copper pipes along the edge, turning gears, and glowing vials. */
  kwalish(path, random, cls) {
    const parts = [`<path class="sdl-pipe" d="${follow(path, () => 1.6)}"/>`, `<path class="sdl-pipe thin" d="${
      follow(path, () => 3.6)}"/>`];
    for ( let s = 10; s < path.length - 4; s += 22 ) {
      const p = point(path, s, 2.6);
      parts.push(`<rect class="sdl-pipe-joint${cls(p)}" x="-1" y="-2.2" width="2" height="4.4" ${place(p)}/>`);
    }
    parts.push(hang(path, random, cls, { min: 34, max: 54, offset: 6, scale: [1.2, 1.6] },
      (r, i) => (i % 2 ? `<g class="sdl-spin" ${scatter(r, 20)}><path class="sdl-gear" d="${gearPath(8, 3)}"/></g>`
        : "<path class=\"sdl-vial\" d=\"M-.7,-3V-1.2L-2,1.6A2,1.6 0 0 0 2,1.6L.7,-1.2V-3Z\"/>"
          + "<path class=\"sdl-vial-liquid\" d=\"M-1.6,.8L-2,1.6A2,1.6 0 0 0 2,1.6L1.6,.8Z\"/>")));
    parts.push(drift(path, random, cls, { min: 26, max: 40, offset: [6, 13] },
      r => `<circle class="sdl-mote c-spark" r="${f(0.3 + (r() * 0.4))}" ${scatter(r, 4)}/>`));
    return parts.join("");
  },

  /** Dragon Delves: a dragon's hoard spilling over the edge, gems of every dragon's colour, and claws gripping it. */
  delves(path, random, cls) {
    const colours = ["red", "blue", "green", "white", "black", "gold", "silver", "bronze"];
    return [
      hang(path, random, cls, { min: 2.4, max: 4, offset: s => 0.6 + (1.2 * Math.abs(Math.sin(s / 14))), scale: [0.8, 1.1] },
        () => coin()),
      hang(path, random, cls, { min: 16, max: 26, offset: 4.6, turn: 20, scale: [1.3, 1.6] },
        (r, i) => gem(colours[i % colours.length])),
      hang(path, random, cls, { min: 80, max: 120, offset: -0.4, scale: [1.4, 1.6] },
        () => "<path class=\"sdl-talon dark\" d=\"M-3,0Q-3.4,4 -1.6,6Q-2,3 -1.4,0ZM-.6,0Q-.4,4.4 .6,6.4Q.6,3 .6,0Z"
          + "M1.4,0Q2,3.6 3.4,5.4Q3,2.4 2.8,0Z\"/>")
    ].join("");
  }
};

