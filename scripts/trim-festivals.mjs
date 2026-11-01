import { f, facesDown, follow, pick, place, point, swags, walk } from "./trim-path.mjs";

/**
 * The festivals' trim, put up for the day in place of the season's while the frame follows the seasons: holly and
 * bells for midwinter, new grass and daisies for the spring festival, lanterns for midsummer, bunting and shields
 * for Shieldmeet, wheat and apples for the harvest, and moonflowers and silver crescents for the Feast of the Moon.
 */

const HOLLY = "M0,0C1,-1.6 2,-1 2.4,-2.2C3,-1.2 4,-1.6 4.6,-2C4.8,-.8 6,-.6 7,0C6,.6 4.8,.8 4.6,2C4,1.6 3,1.2 2.4,2.2"
  + "C2,1 1,1.6 0,0Z";
const LEAF = "M0,0Q2.5,-2.2 6,0Q2.5,2.2 0,0Z";
const CRESCENT = "M0,2A3,3 0 1 0 0,8A3.6,3.6 0 0 1 0,2Z";

/**
 * A flower of round petals about a heart.
 * @param {number} count   How many petals.
 * @param {number} radius  How far each petal is from the heart.
 * @param {number} size    Each petal's radius.
 * @returns {string}
 */
function petals(count, radius, size) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i * 2 * Math.PI) / count;
    return `<circle cx="${f(radius * Math.cos(a))}" cy="${f(radius * Math.sin(a))}" r="${size}"/>`;
  }).join("");
}

/**
 * A point to hang a piece from: straight down where the outline faces down enough, and out from it elsewhere.
 * @returns {{x: number, y: number, deg: number}}
 */
function hangFrom(path, s, offset) {
  const p = point(path, s, offset);
  return facesDown(path, s) > 0.5 ? { ...p, deg: 0 } : p;
}

/** How each festival dresses an outline. Each piece is handed the class to add to it. */
export const FESTIVALS = {
  /** Midwinter and Needfest: a holly garland, red berries, and golden bells. */
  midwinter(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1.2 + Math.sin((s / 8) + phase);
    const parts = [`<path class="sdl-garland" d="${follow(path, wave)}"/>`];
    let side = 1;
    walk(path, random, 3.5, 6, s => {
      const p = point(path, s, wave(s));
      side = -side;
      parts.push(`<path class="sdl-holly${random() < 0.3 ? " light" : ""}${cls(p)}" `
        + `${place(p, side * (30 + (random() * 50)), 0.8 + (random() * 0.4))} d="${HOLLY}"/>`);
    });
    walk(path, random, 10, 18, s => {
      const p = point(path, s, wave(s) + 1.5);
      parts.push(`<g class="sdl-berries${cls(p)}" ${place(p, random() * 120)}>${petals(3, 1.1, 1)}</g>`);
    });
    walk(path, random, 45, 70, s => {
      if ( facesDown(path, s) < 0.6 ) return;
      const p = { ...point(path, s, 2), deg: 0 };
      parts.push(`<g class="sdl-bell${cls(p)}" ${place(p)}><path class="sdl-ribbon" d="M0,-1V3"/>`
        + "<path d=\"M-2.4,7.5Q-2.4,3 0,3Q2.4,3 2.4,7.5L3,8.3H-3Z\"/><circle class=\"clapper\" cy=\"8.8\" r=\".8\"/></g>");
    });
    return parts.join("");
  },

  /** Greengrass and Growfest: new grass along the edge, with daisies in it. */
  greengrass(path, random, cls) {
    const parts = [];
    walk(path, random, 1.2, 2.6, s => {
      const p = point(path, s, -0.5);
      const h = 3 + (random() * 5);
      const shade = pick(random, ["", " light", " dark"]);
      parts.push(`<path class="sdl-grass${shade}${cls(p)}" ${place(p, (random() - 0.5) * 40)} `
        + `d="M-.8,0Q0,${f(h * 0.5)} 0,${f(h)}Q0,${f(h * 0.5)} .8,0Z"/>`);
    });
    walk(path, random, 14, 26, s => {
      const p = point(path, s, 3 + (random() * 3));
      const ring = Array.from({ length: 8 }, (_, i) => `<ellipse rx=".7" ry="1.8" cy="-2" transform="rotate(${i * 45})"/>`);
      parts.push(`<g class="sdl-daisy${cls(p)}" ${place(p, random() * 45, 0.8 + (random() * 0.4))}>`
        + `${ring.join("")}<circle class="heart" r="1.1"/></g>`);
    });
    return parts.join("");
  },

  /** Midsummer and Richfest: strings of glowing paper lanterns. */
  midsummer(path, random, cls) {
    const { d, lows, sags } = swags(path, random, 28, 44, 7);
    const parts = [`<path class="sdl-cord" d="${d}"/>`];
    for ( const s of lows ) {
      const p = hangFrom(path, s, sags(s));
      const colour = pick(random, ["gold", "red", "orange", "rose"]);
      parts.push(`<g class="sdl-lantern ${colour}${cls(p)}" ${place(p, 0, 1.35)}><path class="string" d="M0,0V1.5"/>`
        + "<rect class=\"cap\" x=\"-1.4\" y=\"1.2\" width=\"2.8\" height=\"1\"/>"
        + `<ellipse class="glow" cy="4.6" rx="2.6" ry="3.4" style="animation-delay: -${f(random() * 3)}s"/>`
        + "<rect class=\"cap\" x=\"-1.4\" y=\"7.8\" width=\"2.8\" height=\"1\"/></g>");
    }
    return parts.join("");
  },

  /** Shieldmeet: bunting, with a painted shield at each pin. */
  shieldmeet(path, random, cls) {
    const { d, pins, sags } = swags(path, random, 30, 46, 4);
    const parts = [`<path class="sdl-cord" d="${d}"/>`];
    const colours = ["red", "blue", "gold", "white"];
    let i = 0;
    for ( let s = 3; s < path.length - 2; s += 6 ) {
      const p = point(path, s, sags(s));
      parts.push(`<polygon class="sdl-pennant ${colours[i++ % colours.length]}${cls(p)}" ${place(p)} `
        + "points=\"-2.4,0 2.4,0 0,5.5\"/>");
    }
    for ( const s of pins.slice(1, -1) ) {
      const p = point(path, s, 1);
      parts.push(`<g class="sdl-shield ${pick(random, colours)}${cls(p)}" ${place(p, 0, 0.9)}>`
        + "<path d=\"M-3.2,0H3.2V3Q3.2,6.5 0,8Q-3.2,6.5 -3.2,3Z\"/><path class=\"boss\" d=\"M0,1V6.6M-2.4,3.2H2.4\"/></g>");
    }
    return parts.join("");
  },

  /** Highharvestide and Brewfest: ears of wheat tied along a twine, and red apples. */
  harvest(path, random, cls) {
    const parts = [`<path class="sdl-twine" d="${follow(path, () => 0.6)}"/>`];
    walk(path, random, 4, 8, s => {
      const p = point(path, s, 0.4);
      const length = 6 + (random() * 4);
      const grains = [];
      for ( let y = length * 0.45, k = 0; y < length; y += 1.1, k++ ) {
        const x = k % 2 ? 0.8 : -0.8;
        grains.push(`<ellipse cx="${x}" cy="${f(y)}" rx=".7" ry="1.3" transform="rotate(${k % 2 ? -25 : 25} ${x} ${f(y)})"/>`);
      }
      parts.push(`<g class="sdl-wheat${cls(p)}" ${place(p, (random() - 0.5) * 50)}>`
        + `<path class="stalk" d="M0,0V${f(length)}"/>${grains.join("")}</g>`);
    });
    walk(path, random, 30, 50, s => {
      const p = point(path, s, 3.5);
      parts.push(`<g class="sdl-apple${cls(p)}" ${place(p, (random() - 0.5) * 40)}>`
        + "<circle r=\"2.3\"/><path class=\"stem\" d=\"M0,-2.2L-.4,-3.4\"/><path class=\"leaf\" d=\"M-.3,-3L1.8,-3.6\"/></g>");
    });
    return parts.join("");
  },

  /** The Feast of the Moon: a dark vine of pale moonflowers, hung with silver crescents for the dead. */
  moonfeast(path, random, cls) {
    const phase = random() * 10;
    const wave = s => 1 + (1.5 * Math.sin((s / 9) + phase));
    const parts = [`<path class="sdl-vine night" d="${follow(path, wave)}"/>`];
    let side = 1;
    walk(path, random, 6, 10, s => {
      const p = point(path, s, wave(s));
      side = -side;
      parts.push(`<path class="sdl-leaf night${cls(p)}" ${place(p, side * (40 + (random() * 40)), 0.8)} d="${LEAF}"/>`);
    });
    walk(path, random, 18, 30, s => {
      const p = point(path, s, 2 + (random() * 2));
      parts.push(`<g class="sdl-moonflower${cls(p)}" ${place(p, random() * 60, 0.8 + (random() * 0.4))} `
        + `style="animation-delay: -${f(random() * 4)}s">${petals(6, 2, 1.5)}<circle class="heart" r="1"/></g>`);
    });
    walk(path, random, 40, 60, s => {
      if ( facesDown(path, s) < 0.6 ) return;
      const p = { ...point(path, s, wave(s)), deg: 0 };
      parts.push(`<g class="sdl-crescent${cls(p)}" ${place(p)}><path class="sdl-ribbon" d="M0,0V2"/>`
        + `<path d="${CRESCENT}"/></g>`);
    });
    return parts.join("");
  }
};

/**
 * The trim for a festival day, by the festival's name in D&D 5e's calendars or the module's additional ones.
 * @param {string} [name]  The festival's localization key, such as "DND5E.CALENDAR.Harptos.Festival.Midwinter".
 * @returns {string|null}
 */
export function festivalTrimKind(name = "") {
  const key = String(name).split(".").at(-1);
  return {
    Midwinter: "midwinter", Needfest: "midwinter", WintersCrest: "midwinter",
    Greengrass: "greengrass", Growfest: "greengrass", RenewalFestival: "greengrass", WildsGrandeur: "greengrass",
    Midsummer: "midsummer", Richfest: "midsummer", Zenith: "midsummer", Highsummer: "midsummer",
    Shieldmeet: "shieldmeet",
    Highharvestide: "harvest", Brewfest: "harvest", HarvestsClose: "harvest", HarvestsRise: "harvest",
    FeastOfTheMoon: "moonfeast",
    // The Exandrian calendar's other holidays, each with its own trim.
    NewDawn: "newdawn", Hillsgold: "hillsgold", DayOfChallenging: "challenging", MerryfrondsDay: "merryfrond",
    DeepSolace: "deepsolace", ArtisansFaire: "artisansfaire", Elvendawn: "elvendawn", MornOfLargesse: "largesse",
    HazelFestival: "hazel", CivilizationsDawn: "civilization", NightOfAscension: "ascension", ZansCup: "zanscup",
    BarrenEve: "barreneve", Embertide: "embertide"
  }[key] ?? null;
}
