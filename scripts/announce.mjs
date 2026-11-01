import { festivalName, formatComponents, moonEventLabels, nextHour } from "./calendar.mjs";
import { MODULE_ID } from "./constants.mjs";
import * as sky from "./sky.mjs";

/**
 * Daybreak in the chat. While the GM has it turned on, time passing over a sunrise posts the day that dawned: its
 * date, and whether it starts a season or is a festival. A jump over several days posts only the last.
 */

/**
 * Listen for time passing.
 */
export function registerAnnouncements() {
  Hooks.on("updateWorldTime", (worldTime, deltaTime) => announceDaybreak(worldTime, deltaTime));
}

/* -------------------------------------------- */

/**
 * Post the day that dawned, if time passing went over a sunrise.
 * @param {number} worldTime
 * @param {number} deltaTime
 * @returns {Promise<ChatMessage|void>}
 */
export function announceDaybreak(worldTime, deltaTime) {
  if ( !game.user.isActiveGM || !(deltaTime > 0) || !game.settings.get(MODULE_ID, "announceDays") ) return;
  if ( !game.settings.get("dnd5e", "calendarConfig")?.enabled ) return;
  const dawn = lastSunrise(worldTime);
  if ( dawn <= worldTime - deltaTime ) return;
  return ChatMessage.implementation.create({
    content: daybreakCard(dawn),
    speaker: { alias: _loc("SDL.Chat.Speaker") }
  });
}

/* -------------------------------------------- */

/**
 * The world time of the last sunrise at or before a world time.
 * @param {number} time
 * @returns {number}
 */
export function lastSunrise(time) {
  const calendar = game.time.calendar;
  const sunrise = components => calendar.sunrise?.(components) ?? (calendar.days.hoursPerDay * 0.25);
  const roughly = nextHour(time + 1, sunrise(calendar.timeToComponents(time)), -1);
  const day = sky.secondsPerDay(calendar);
  const midnight = roughly - sky.wrap(roughly, day);
  const exact = midnight + Math.round(sunrise(calendar.timeToComponents(midnight)) / calendar.days.hoursPerDay * day);
  return exact <= time ? exact : exact - day;
}

/* -------------------------------------------- */

/**
 * The chat card for the day that dawned at a world time.
 * @param {number} dawn
 * @returns {string}
 */
export function daybreakCard(dawn) {
  const calendar = game.time.calendar;
  const escape = foundry.utils.escapeHTML;
  const components = calendar.timeToComponents(dawn);
  const yesterday = calendar.timeToComponents(dawn - sky.secondsPerDay(calendar));
  const weekday = calendar.days.values[components.dayOfWeek];
  const season = calendar.seasons.values[components.season];
  const festival = festivalName(calendar, components);
  const date = formatComponents(calendar, components, "date", "monthDayYear");
  const rows = [
    weekday ? `<p class="sdl-chat-when">${escape(_loc("SDL.Announce.Weekday", { day: _loc(weekday.name).capitalize() }))}</p>` : "",
    season && (components.season !== yesterday.season)
      ? `<p><i class="fa-solid fa-leaf"></i> ${escape(_loc("SDL.Announce.Season", { season: _loc(season.name) }))}</p>` : "",
    festival ? `<p><i class="fa-solid fa-star-christmas"></i> ${escape(festival)}</p>` : "",
    ...moonEventLabels(dawn).map(label => `<p><i class="fa-solid fa-moon"></i> ${escape(label)}</p>`)
  ];
  return `<div class="sdl-chat sdl-daybreak"><h3><i class="fa-solid fa-sunrise"></i> `
    + `${escape(_loc("SDL.Announce.Title", { date }))}</h3>${rows.join("")}</div>`;
}
