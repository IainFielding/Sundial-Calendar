import { MODULE_ID } from "./constants.mjs";
import * as sky from "./sky.mjs";
import { DEFAULT_SUNS } from "./suns.mjs";

/**
 * Helpers for reading the world calendar, shared by the calendar HUD and the chat.
 */

/**
 * Format time components with the date or time format the user picked in D&D 5e's calendar preferences, or with
 * one of D&D 5e's formatters by name.
 * @param {object} calendar
 * @param {object} components
 * @param {"date"|"time"} kind
 * @param {string} [value]  A formatter's value in `CONFIG.DND5E.calendar.formatters`, rather than the user's pick.
 * @returns {string}
 */
export function formatComponents(calendar, components, kind, value) {
  const formatters = CONFIG.DND5E.calendar.formatters;
  const prefs = game.settings.get("dnd5e", "calendarPreferences");
  const formatter = (value && formatters.find(f => f.value === value))
    ?? formatters.find(f => f.value === prefs.formatters[kind]);
  return formatter ? calendar.format(components, formatter.formatter) : "";
}

/**
 * The name of the festival falling on a day, if any: a festival day of the Calendar of Harptos, or a day in one of
 * the festival weeks of the Calendar of Greyhawk.
 * @param {object} calendar
 * @param {object} components
 * @returns {string}
 */
export function festivalName(calendar, components) {
  const key = festivalKey(calendar, components);
  return key ? _loc(key) : "";
}

/**
 * The localization key of the festival falling on a day, if any, as {@link festivalName} finds it.
 * @param {object} calendar
 * @param {object} components
 * @returns {string}
 */
export function festivalKey(calendar, components) {
  const festival = calendar.findFestivalDay?.(components);
  if ( festival ) return festival.name;
  const month = calendar.months.values[components.month];
  return month?.name.includes(".Festival.") ? month.name : "";
}

/**
 * The moons of the world's calendar.
 * @returns {import("./sky.mjs").MoonConfig[]}
 */
export function worldMoons() {
  const key = game.settings.get("dnd5e", "calendar");
  return game.modules.get(MODULE_ID).api?.moons[key] ?? [];
}

/**
 * The world calendar's suns. Every world has a sun, so a calendar with none listed has the usual one; a module can
 * give a calendar an empty list for a sunless sky.
 * @returns {import("./sky.mjs").SunConfig[]}
 */
export function worldSuns() {
  const key = game.settings.get("dnd5e", "calendar");
  return game.modules.get(MODULE_ID).api?.suns?.[key] ?? DEFAULT_SUNS;
}

/**
 * Each of the world's moons and its phase at a world time.
 * @param {number} [time]  World time in seconds, by default now.
 * @returns {{moon: import("./sky.mjs").MoonConfig, name: string, phase: number, phaseName: string}[]}
 */
export function moonPhases(time = game.time.worldTime) {
  const calendar = game.time.calendar;
  return worldMoons().map(moon => {
    const phase = sky.moonPhase(calendar, moon, time);
    return { moon, name: _loc(moon.name), phase, phaseName: _loc(`SDL.MoonPhase.${sky.phaseName(phase)}`) };
  });
}

/**
 * What the moons do on the day a world time falls in, written out: which are full or new, and which are full
 * together.
 * @param {number} [time]  World time in seconds, by default now.
 * @returns {string[]}
 */
export function moonEventLabels(time = game.time.worldTime) {
  const calendar = game.time.calendar;
  const midnight = time - sky.wrap(time, sky.secondsPerDay(calendar));
  const events = sky.moonEvents(calendar, worldMoons(), midnight);
  const names = moons => moons.map(m => _loc(m.name));
  const list = moons => game.i18n.getListFormatter().format(names(moons));
  const labels = [];
  if ( events.full.length > 1 ) labels.push(_loc("SDL.MoonEvent.FullTogether", { moons: list(events.full) }));
  else if ( events.full.length ) labels.push(_loc("SDL.MoonEvent.Full", { moon: list(events.full) }));
  for ( const name of names(events.new) ) labels.push(_loc("SDL.MoonEvent.New", { moon: name }));
  return labels;
}

/**
 * Each of the world's moons at a world time, written out: its phase, and when it is next full.
 * @param {number} [time]  World time in seconds, by default now.
 * @returns {string[]}
 */
export function moonForecast(time = game.time.worldTime) {
  const calendar = game.time.calendar;
  const day = sky.secondsPerDay(calendar);
  return moonPhases(time).map(({ moon, name, phaseName }) => {
    const full = sky.nextFullMoon(calendar, moon, time);
    const days = Math.floor(full / day) - Math.floor(time / day);
    const date = formatComponents(calendar, calendar.timeToComponents(full), "date");
    let when;
    if ( days === 0 ) when = _loc("SDL.MoonForecast.FullToday");
    else if ( days === 1 ) when = _loc("SDL.MoonForecast.FullTomorrow", { date });
    else when = _loc("SDL.MoonForecast.FullIn", { days, date });
    return `${name}: ${phaseName}, ${when}`;
  });
}

/**
 * The world time a moment of the day falls at: the next one after a world time, or the last one before it.
 * @param {number} time      World time in seconds.
 * @param {number} hour      Decimal hours since midnight.
 * @param {1|-1} direction   1 for the next, -1 for the last.
 * @returns {number}
 */
export function nextHour(time, hour, direction) {
  const calendar = game.time.calendar;
  const day = sky.secondsPerDay(calendar);
  const target = hour / calendar.days.hoursPerDay * day;
  const now = sky.wrap(time, day);
  const delta = sky.wrap((target - now) * direction, day) || day;
  return time + (delta * direction);
}
