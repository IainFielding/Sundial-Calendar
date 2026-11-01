/**
 * The suns of each of D&D 5e's calendars and the module's additional ones, keyed by the calendar's value in
 * `CONFIG.DND5E.calendar.calendars`. A calendar not listed here has {@link DEFAULT_SUNS}.
 *
 * Each sun rises at the calendar's sunrise and sets at its sunset, unless it trails them by an offset. Modules and
 * world scripts can change these, or add suns for their own calendars, in the `sogrom-sundial-calendar.suns`
 * hook, which is passed this object and the world's calendar key before the calendar first draws.
 *
 * @import { SunConfig } from "./sky.mjs"
 */

/** The sun of a world with no suns of its own listed. */
export const DEFAULT_SUNS = Object.freeze([
  Object.freeze({ id: "sun", name: "SDL.Sun.Sun", color: "#ffd45c" })
]);

/** @type {Record<string, SunConfig[]>} */
export const SUNS = {
  gregorian: [{ id: "sun", name: "SDL.Sun.Sun", color: "#ffd45c" }],
  harptos: [{ id: "sun", name: "SDL.Sun.Sun", color: "#ffd45c" }],

  // In the Spelljammer setting Oerth's sun is Liga, which circles the world at the centre of its sphere.
  greyhawk: [{ id: "liga", name: "SDL.Sun.Liga", color: "#ffd45c" }],

  khorvaire: [{ id: "sun", name: "SDL.Sun.Sun", color: "#ffd45c" }],
  exandria: [{ id: "sun", name: "SDL.Sun.Sun", color: "#ffd45c" }],
  krynn: [{ id: "sun", name: "SDL.Sun.Sun", color: "#ffd45c" }]
};
