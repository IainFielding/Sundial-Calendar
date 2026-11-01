import { festivalName, formatComponents, moonEventLabels, moonForecast, nextHour } from "./calendar.mjs";
import * as sky from "./sky.mjs";

/**
 * Chat commands for the calendar:
 *
 * - `/date` tells you the date, the time, the season, any festival, and the moons' phases and next full moons.
 * - `/advance` and `/rewind` move the time on or back, for the GM: by an amount, such as `/advance 8 hours` or
 *   `/rewind 1 day 6 hours`, or to the next or last part of the day, such as `/advance dawn`. On their own they move
 *   an hour, as the bar's buttons do.
 */

const COMMAND = /^\/(date|advance|rewind)(?:\s+(.*))?$/is;

/** The words each unit of time can be written as. */
const UNITS = {
  second: ["s", "sec", "secs", "second", "seconds"],
  minute: ["m", "min", "mins", "minute", "minutes"],
  hour: ["h", "hr", "hrs", "hour", "hours"],
  day: ["d", "day", "days"],
  week: ["w", "wk", "wks", "week", "weeks"]
};

/** The moments of the day `/advance` and `/rewind` can move to, as the hour each falls at on a day. */
const MOMENTS = {
  dawn: (calendar, components) => calendar.sunrise?.(components) ?? (calendar.days.hoursPerDay * 0.25),
  noon: calendar => calendar.days.hoursPerDay / 2,
  dusk: (calendar, components) => calendar.sunset?.(components) ?? (calendar.days.hoursPerDay * 0.75),
  midnight: () => 0
};
MOMENTS.sunrise = MOMENTS.dawn;
MOMENTS.sunset = MOMENTS.dusk;

/* -------------------------------------------- */

/**
 * Listen for the commands in the chat.
 */
export function registerChatCommands() {
  Hooks.on("chatMessage", (_chatLog, message) => {
    const match = message.trim().match(COMMAND);
    if ( !match ) return;
    const [, command, args = ""] = match;
    if ( command.toLowerCase() === "date" ) postDate();
    else moveTime(command.toLowerCase() === "advance" ? 1 : -1, args);
    return false;
  });
}

/* -------------------------------------------- */

/**
 * The number of seconds in a duration written out, such as "8 hours", "1d 6h" or "90 minutes". A number without
 * a unit is hours.
 * @param {string} text
 * @param {object} calendar
 * @returns {number|null}  Null if the text isn't a duration.
 */
export function parseDuration(text, calendar) {
  const { secondsPerMinute, minutesPerHour, hoursPerDay } = calendar.days;
  const seconds = {
    second: 1,
    minute: secondsPerMinute,
    hour: secondsPerMinute * minutesPerHour,
    day: secondsPerMinute * minutesPerHour * hoursPerDay,
    week: secondsPerMinute * minutesPerHour * hoursPerDay * (calendar.days.values?.length || 7)
  };
  const words = String(text).toLowerCase().replace(/(\d)([a-z])/g, "$1 $2").replace(/,|\band\b/g, " ")
    .split(/\s+/).filter(Boolean);
  if ( !words.length ) return null;
  let total = 0;
  for ( let i = 0; i < words.length; i++ ) {
    const amount = Number(words[i]);
    if ( !Number.isFinite(amount) || (amount < 0) ) return null;
    const next = words[i + 1];
    const unit = next && Object.keys(UNITS).find(u => UNITS[u].includes(next));
    if ( unit ) i++;
    else if ( next !== undefined ) return null;
    total += amount * seconds[unit ?? "hour"];
  }
  return Math.round(total);
}

/* -------------------------------------------- */

/**
 * Whisper the date and the sky to the user who asked.
 * @returns {Promise<ChatMessage>}
 */
export function postDate() {
  const calendar = game.time.calendar;
  const components = game.time.components;
  const escape = foundry.utils.escapeHTML;
  const weekday = calendar.days.values[components.dayOfWeek];
  const season = calendar.seasons.values[components.season];
  const festival = festivalName(calendar, components);
  const when = [weekday ? _loc(weekday.name).capitalize() : "", formatComponents(calendar, components, "time")];
  const rows = [
    `<p class="sdl-chat-when">${escape(when.filter(Boolean).join(" – "))}</p>`,
    season ? `<p><i class="fa-solid fa-leaf"></i> ${escape(_loc(season.name))}</p>` : "",
    festival ? `<p><i class="fa-solid fa-star-christmas"></i> ${escape(festival)}</p>` : "",
    ...moonEventLabels().map(label => `<p><i class="fa-solid fa-circle"></i> ${escape(label)}</p>`),
    ...moonForecast().map(line => `<p><i class="fa-solid fa-moon"></i> ${escape(line)}</p>`)
  ];
  const content = `<div class="sdl-chat"><h3>${escape(formatComponents(calendar, components, "date", "monthDayYear"))}</h3>`
    + `${rows.join("")}</div>`;
  return ChatMessage.implementation.create({
    content,
    speaker: { alias: _loc("SDL.Chat.Speaker") },
    whisper: [game.user.id]
  });
}

/* -------------------------------------------- */

/**
 * Move the world time on or back, for the GM.
 * @param {1|-1} direction
 * @param {string} args     What follows the command: an amount of time, or a moment of the day.
 * @returns {Promise<number>|void}
 */
export function moveTime(direction, args) {
  if ( !game.user.isGM ) {
    ui.notifications.warn("SDL.Chat.GMOnly", { localize: true });
    return;
  }
  const calendar = game.time.calendar;
  const text = args.trim().toLowerCase();
  const now = game.time.worldTime;
  let delta;
  if ( text in MOMENTS ) {
    // Find the day the moment next (or last) falls on, then the moment on that day, which may move with the seasons.
    const roughly = nextHour(now, MOMENTS[text](calendar, game.time.components), direction);
    const day = sky.secondsPerDay(calendar);
    const midnight = roughly - sky.wrap(roughly, day);
    const hour = MOMENTS[text](calendar, calendar.timeToComponents(midnight));
    delta = midnight + Math.round(hour / calendar.days.hoursPerDay * day) - now;
  } else {
    const seconds = parseDuration(text || "1 hour", calendar);
    if ( !seconds ) {
      ui.notifications.warn(_loc("SDL.Chat.Usage", { command: direction > 0 ? "/advance" : "/rewind" }));
      return;
    }
    delta = seconds * direction;
  }
  return game.time.advance(delta);
}
