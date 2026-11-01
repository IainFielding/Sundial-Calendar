import { worldMoons } from "./calendar.mjs";
import { MODULE_ID } from "./constants.mjs";
import * as sky from "./sky.mjs";

/**
 * The active scene's darkness, kept in step with the sky: light by day, fading through the late afternoon and
 * twilight by the height of the sun, dark at night, and a little less dark under a bright moon. Only the active GM
 * writes it, and only while the GM has it turned on. A scene the GM has taken off the sky, such as a dungeon, is left
 * as it is.
 */

/** The scene flag that says whether a scene follows the sky. Missing means it does. */
const FOLLOW_FLAG = `flags.${MODULE_ID}.followSky`;

/** How long a change of darkness takes to play out on the canvas. */
const DARKNESS_ANIMATION_MS = 2000;

/** Changes smaller than this are left alone, so a combat round's six seconds don't update the scene. */
const DARKNESS_STEP = 0.01;

/**
 * Listen for the changes that move the sun or the scene.
 */
export function registerDarknessHooks() {
  Hooks.on("updateWorldTime", () => syncDarkness());
  Hooks.on("updateScene", (scene, changes) => {
    if ( changes.active || foundry.utils.hasProperty(changes, "environment.darknessLock")
      || foundry.utils.hasProperty(changes, FOLLOW_FLAG) ) syncDarkness();
  });
  Hooks.on("renderSceneConfig", addFollowSkySetting);
  Hooks.once("ready", () => syncDarkness({ animate: false }));
}

/* -------------------------------------------- */

/**
 * Set the active scene's darkness for the time of day.
 * @param {object} [options]
 * @param {boolean} [options.animate=true]  Play the change out on the canvas.
 * @returns {Promise<Scene|void>}
 */
export async function syncDarkness({ animate = true } = {}) {
  if ( !game.user.isActiveGM || !game.settings.get(MODULE_ID, "sceneDarkness") ) return;
  const scene = game.scenes.active;
  if ( !scene || scene.environment.darknessLock || !followsSky(scene) ) return;
  const target = darknessNow();
  if ( Math.abs(scene.environment.darknessLevel - target) < DARKNESS_STEP ) return;
  return scene.update({ "environment.darknessLevel": target },
    { animateDarkness: animate ? DARKNESS_ANIMATION_MS : false });
}

/* -------------------------------------------- */

/**
 * Whether a scene's darkness follows the sky. Scenes do unless the GM unticks Follow the Sky in their configuration.
 * @param {Scene} scene
 * @returns {boolean}
 */
export function followsSky(scene) {
  return foundry.utils.getProperty(scene, FOLLOW_FLAG) !== false;
}

/* -------------------------------------------- */

/**
 * Add Follow the Sky to the Darkness section of a scene's configuration, under Darkness Level Lock. It's a named
 * input in the sheet's form, so it saves with the rest of the sheet.
 * @param {SceneConfig} app
 * @param {HTMLElement} element
 */
function addFollowSkySetting(app, element) {
  const lock = element.querySelector('.tab[data-tab="environment"] [name="environment.darknessLock"]')
    ?.closest(".form-group");
  if ( !lock || lock.parentElement.querySelector(`[name="${FOLLOW_FLAG}"]`) ) return;
  const { createCheckboxInput, createFormGroup } = foundry.applications.fields;
  const input = createCheckboxInput({ name: FOLLOW_FLAG, value: followsSky(app.document) });
  lock.after(createFormGroup({
    label: "SDL.Scene.FollowSky.Name", hint: "SDL.Scene.FollowSky.Hint", input, rootId: app.id, localize: true
  }));
}

/* -------------------------------------------- */

/**
 * How dark it is at the world time, from the world calendar's own sunrise and sunset, and its moons.
 * @returns {number}
 */
export function darknessNow() {
  const calendar = game.time.calendar;
  const components = game.time.components;
  const time = game.time.worldTime;
  const hoursPerDay = calendar.days.hoursPerDay;
  const fraction = sky.dayFraction(calendar, time);
  const sunrise = calendar.sunrise?.(components) ?? (hoursPerDay * 0.25);
  const sunset = calendar.sunset?.(components) ?? (hoursPerDay * 0.75);
  const moonlight = sky.moonlight(fraction, worldMoons().map(moon => sky.moonPhase(calendar, moon, time)),
    sunrise / hoursPerDay, sunset / hoursPerDay);
  return sky.darkness(fraction * hoursPerDay, sunrise, sunset, hoursPerDay, moonlight);
}
