import { MODULE_ID } from "./constants.mjs";
import { followsSky } from "./darkness.mjs";
import * as sky from "./sky.mjs";

/**
 * The warm light of dawn and dusk. While the scene's darkness follows the sky, its light turns gold around sunrise and
 * amber around sunset. Each client works the tint out for itself from the world time and hands it to Foundry as the
 * scene's lighting is set up, so nothing is written to the scene, and a scene the GM has tinted is left as it is.
 */

/** Changes of tint smaller than this don't redraw the scene's lighting. */
const TINT_STEP = 0.01;

/**
 * The tint last handed to the canvas, so the lighting is only redrawn when it changes.
 * @type {{hue: number, intensity: number}|null}
 */
let applied = null;

/**
 * Listen for the lighting being set up and for the changes that move the tint.
 */
export function registerAmbienceHooks() {
  Hooks.on("configureCanvasEnvironment", tintEnvironment);
  Hooks.on("updateWorldTime", () => refreshWarmLight());
  Hooks.on("canvasReady", () => { applied = null; });
  Hooks.on("updateScene", scene => {
    if ( scene === canvas?.scene ) refreshWarmLight();
  });
}

/* -------------------------------------------- */

/**
 * Add the warm light to a scene's lighting as Foundry sets it up. A config that already brings its own base
 * ambience, such as the preview while the GM edits a scene's lighting, is left alone.
 * @param {object} config  The canvas environment config, which the hook's listeners may change.
 */
function tintEnvironment(config) {
  if ( config.environment?.base ) return;
  const tint = warmLightNow(canvas?.scene);
  applied = tint;
  if ( !tint ) return;
  config.environment ??= {};
  config.environment.base = { hue: tint.hue, intensity: tint.intensity };
}

/* -------------------------------------------- */

/**
 * Redraw the scene's lighting if the warm light has changed enough to see.
 * @param {object} [options]
 * @param {boolean} [options.force=false]  Redraw whatever the change.
 */
export function refreshWarmLight({ force = false } = {}) {
  if ( !canvas?.ready || !canvas.scene ) return;
  const tint = warmLightNow(canvas.scene);
  const same = (applied?.hue === tint?.hue)
    && (Math.abs((applied?.intensity ?? 0) - (tint?.intensity ?? 0)) < TINT_STEP);
  if ( same && !force ) return;
  canvas.environment.initialize();
}

/* -------------------------------------------- */

/**
 * The warm light on a scene at the world time, or null when it has none: when the GM has turned it or the scene's
 * darkness off, the scene isn't the active one, its darkness is locked or doesn't follow the sky, it has a tint of
 * its own, or it isn't dawn or dusk.
 * @param {Scene|null|undefined} scene
 * @returns {{hue: number, intensity: number}|null}
 */
export function warmLightNow(scene) {
  if ( !scene || (scene !== game.scenes.active) ) return null;
  if ( !game.settings.get(MODULE_ID, "warmLight") || !game.settings.get(MODULE_ID, "sceneDarkness") ) return null;
  if ( scene.environment.darknessLock || !followsSky(scene) ) return null;
  if ( scene._source.environment.base.intensity > 0 ) return null;
  const calendar = game.time.calendar;
  const components = game.time.components;
  const hoursPerDay = calendar.days.hoursPerDay;
  const hour = sky.dayFraction(calendar, game.time.worldTime) * hoursPerDay;
  const sunrise = calendar.sunrise?.(components) ?? (hoursPerDay * 0.25);
  const sunset = calendar.sunset?.(components) ?? (hoursPerDay * 0.75);
  const tint = sky.goldenLight(hour, sunrise, sunset, hoursPerDay);
  return tint.intensity > 0 ? tint : null;
}
