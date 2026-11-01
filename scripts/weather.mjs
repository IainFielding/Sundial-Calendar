import { seededRandom } from "./trim-path.mjs";

/**
 * The weather in the bowl of sky: clouds drifting across it, and rain, snow, fog or leaves over the sky and the
 * wheel, for the weather the GM has set on the scene. Foundry's own weather effects, and those modules add to
 * `CONFIG.weatherEffects`, are matched by their id.
 *
 * Everything here builds SVG markup as text, so it runs the same in the browser and in the unit tests. The styles in
 * calendar.css move it: each falling layer is drawn twice, one copy a full fall above the other, and slides down by
 * one fall over and over, so it never runs out.
 */

/**
 * The kinds of weather the sky shows.
 * @typedef {"clouds"|"rain"|"storm"|"snow"|"blizzard"|"fog"|"leaves"} WeatherKind
 */

/** @type {WeatherKind[]} */
export const WEATHER_KINDS = ["clouds", "rain", "storm", "snow", "blizzard", "fog", "leaves"];

/**
 * The words in a weather effect's id that say what the sky shows, most specific first, so a rain storm is a storm
 * rather than rain.
 * @type {[RegExp, WeatherKind][]}
 */
const MATCHES = [
  [/blizzard/i, "blizzard"],
  [/storm|thunder|lightning/i, "storm"],
  [/rain|drizzle|shower/i, "rain"],
  [/snow|sleet|hail/i, "snow"],
  [/fog|mist|haze/i, "fog"],
  [/lea(f|ves)/i, "leaves"],
  [/cloud|overcast/i, "clouds"]
];

/**
 * What the sky shows for a scene's weather.
 * @param {string|null|undefined} id  The scene's weather, an id in `CONFIG.weatherEffects`; empty for none.
 * @returns {WeatherKind|""}
 */
export function weatherKind(id) {
  if ( !id ) return "";
  return MATCHES.find(([pattern]) => pattern.test(id))?.[1] ?? "";
}

/**
 * How each kind of weather is drawn: how many clouds, and how dark; and what falls, how much of it, and how far it
 * slants for each step it falls.
 * @type {Record<WeatherKind, {clouds: number, dark?: boolean, fall?: "rain"|"snow"|"leaves", count?: number,
 *   slant?: number, fog?: boolean, flash?: boolean}>}
 */
const KINDS = {
  clouds: { clouds: 5 },
  rain: { clouds: 6, fall: "rain", count: 70, slant: 0.25 },
  storm: { clouds: 8, dark: true, fall: "rain", count: 120, slant: 0.4, flash: true },
  snow: { clouds: 5, fall: "snow", count: 55, slant: 0.12 },
  blizzard: { clouds: 7, fall: "snow", count: 140, slant: 0.7 },
  fog: { clouds: 0, fog: true },
  leaves: { clouds: 0, fall: "leaves", count: 22, slant: -0.45 }
};

/** How many leaves Foundry draws for its own falling leaves, as `leaf1.png` to `leaf6.png`. */
const LEAF_IMAGES = 6;

/**
 * The SVG markup for a kind of weather over the sky, to go inside a `<g>` the size of the sky. Snowflakes and leaves
 * are Foundry's own particles, the ones its weather effects use on the canvas.
 * @param {WeatherKind|""} kind
 * @param {{width: number, height: number}} size  The sky's size, in SVG units.
 * @param {string} [particles="ui/particles/"]   Where Foundry serves its particle images.
 * @returns {string}
 */
export function weatherPicture(kind, { width, height }, particles = "ui/particles/") {
  const config = KINDS[kind];
  if ( !config ) return "";
  const random = seededRandom(7 + WEATHER_KINDS.indexOf(kind));
  const parts = [];
  if ( config.fog ) parts.push(fogBanks(random, width, height));
  if ( config.clouds ) parts.push(cloudLayer(random, config, width, height));
  if ( config.fall ) parts.push(fallLayer(random, config, width, height, particles));
  if ( config.flash ) parts.push(`<rect class="sdl-weather-flash" width="${width}" height="${height}"/>`);
  return parts.join("");
}

/* -------------------------------------------- */

/**
 * A layer of clouds along the band the sun and moons ride through, drawn twice side by side so it can drift across
 * the sky without end.
 * @param {() => number} random
 * @param {object} config
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function cloudLayer(random, config, width, height) {
  const clouds = [];
  for ( let i = 0; i < config.clouds; i++ ) {
    const x = ((i + (random() * 0.6)) / config.clouds) * width;
    const y = (height * 0.35) + (random() * height * 0.5);
    clouds.push(cloud(random, x, y, 26 + (random() * 22)));
  }
  const tone = config.dark ? " dark" : "";
  const copy = clouds.join("");
  return `<g class="sdl-weather-clouds${tone}"><g class="sdl-weather-drift" style="--drift: ${-width}px">`
    + `<g>${copy}</g><g transform="translate(${width} 0)">${copy}</g></g></g>`;
}

/**
 * One cloud: a row of puffs on a flat base, drawn as one outline so the puffs don't show seams where they overlap.
 * The puffs rise towards the middle, so the cloud heaps up.
 * @param {() => number} random
 * @param {number} x      Its middle.
 * @param {number} y      Its base.
 * @param {number} span   How wide it is.
 * @returns {string}
 */
function cloud(random, x, y, span) {
  const count = 3 + Math.floor(random() * 3);
  const lift = span * 0.38;
  const points = Array.from({ length: count + 1 }, (_, i) => {
    const along = i / count;
    const heap = (i === 0) || (i === count) ? 0 : Math.sin(Math.PI * along) * (0.7 + (random() * 0.3));
    return [x + ((along - 0.5) * span), y - (lift * heap)];
  });
  let d = `M${fixed(points[0][0])},${fixed(points[0][1])}`;
  for ( let i = 1; i < points.length; i++ ) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const r = Math.hypot(x2 - x1, y2 - y1) * (0.52 + (random() * 0.08));
    d += ` A${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(x2)},${fixed(y2)}`;
  }
  return `<path class="sdl-cloud" d="${d} Z" opacity="${fixed(0.55 + (random() * 0.3))}"/>`;
}

/* -------------------------------------------- */

/**
 * Rain, snow or leaves, scattered over the sky and drawn twice, one copy a full fall above and behind the other, so
 * sliding the pair down by one fall loops without a seam.
 * @param {() => number} random
 * @param {object} config
 * @param {number} width
 * @param {number} height
 * @param {string} particles
 * @returns {string}
 */
function fallLayer(random, config, width, height, particles) {
  const drift = config.slant * height;
  // Spread the drops wider than the sky on the side they slant in from, so the slant doesn't leave a corner empty.
  const left = Math.min(0, drift);
  const span = width + Math.abs(drift);
  const drops = [];
  for ( let i = 0; i < config.count; i++ ) {
    const x = left + (random() * span);
    const y = random() * height;
    drops.push(drop(random, config, x, y, particles));
  }
  const copy = drops.join("");
  return `<g class="sdl-weather-fall ${config.fall}" style="--fall-x: ${fixed(-drift)}px; --fall-y: ${height}px">`
    + `<g>${copy}</g><g transform="translate(${fixed(drift)} ${-height})">${copy}</g></g>`;
}

/**
 * One raindrop, snowflake or leaf.
 * @param {() => number} random
 * @param {object} config
 * @param {number} x
 * @param {number} y
 * @param {string} particles
 * @returns {string}
 */
function drop(random, config, x, y, particles) {
  if ( config.fall === "rain" ) {
    const length = 5 + (random() * 4);
    return `<line x1="${fixed(x)}" y1="${fixed(y)}" x2="${fixed(x - (config.slant * length))}" `
      + `y2="${fixed(y + length)}"/>`;
  }
  if ( config.fall === "snow" ) {
    const size = 2.5 + (random() * 3);
    return `<image href="${particles}snow.png" x="${fixed(x - (size / 2))}" y="${fixed(y - (size / 2))}" `
      + `width="${fixed(size)}" height="${fixed(size)}" opacity="${fixed(0.6 + (random() * 0.4))}"/>`;
  }
  const leaf = 1 + Math.floor(random() * LEAF_IMAGES);
  const size = 8 + (random() * 5);
  const turn = Math.round(random() * 360);
  return `<image href="${particles}leaf${leaf}.png" x="${fixed(x - (size / 2))}" y="${fixed(y - (size / 2))}" `
    + `width="${fixed(size)}" height="${fixed(size)}" transform="rotate(${turn} ${fixed(x)} ${fixed(y)})"/>`;
}

/**
 * Banks of fog, soft-edged and drifting slowly, drawn twice side by side like the clouds.
 * @param {() => number} random
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function fogBanks(random, width, height) {
  const banks = [];
  for ( let i = 0; i < 7; i++ ) {
    const x = (i / 7) * width;
    const y = (height * 0.25) + (random() * height * 0.7);
    banks.push(`<ellipse cx="${fixed(x)}" cy="${fixed(y)}" rx="${fixed(55 + (random() * 30))}" `
      + `ry="${fixed(9 + (random() * 7))}" fill="url(#sdl-fog-puff)"/>`);
  }
  const copy = banks.join("");
  return `<g class="sdl-weather-fog"><g class="sdl-weather-drift" style="--drift: ${-width}px">`
    + `<g>${copy}</g><g transform="translate(${width} 0)">${copy}</g></g></g>`;
}

/**
 * A number with at most one decimal place, for compact markup.
 * @param {number} n
 * @returns {string}
 */
function fixed(n) {
  return String(Math.round(n * 10) / 10);
}
