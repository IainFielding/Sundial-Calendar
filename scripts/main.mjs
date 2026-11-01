import { registerAnnouncements } from "./announce.mjs";
import { addCalendars, registerCalendarsSetting } from "./calendars.mjs";
import { CalendarsMenu } from "./calendars-menu.mjs";
import { registerChatCommands } from "./chat.mjs";
import { MODULE_ID } from "./constants.mjs";
import { darknessNow, registerDarknessHooks, syncDarkness } from "./darkness.mjs";
import { patchDaylight } from "./daylight.mjs";
import { createCalendarHUD } from "./hud.mjs";
import { MOONS } from "./moons.mjs";
import * as sky from "./sky.mjs";
import { SUNS } from "./suns.mjs";
import { BAR_TRIM_CHOICES, SKY_TRIM_CHOICES } from "./trim.mjs";

/* -------------------------------------------- */
/*  Initialization                              */
/* -------------------------------------------- */

// D&D 5e picks the world's calendar during its own init, before the module's, so the additional calendars join its
// list from the hook it calls just before.
Hooks.once("dnd5e.setupCalendar", addCalendars);

Hooks.once("init", () => {
  registerCalendarsSetting();
  game.settings.registerMenu(MODULE_ID, "calendarsMenu", {
    name: "SDL.Settings.Calendars.Name",
    label: "SDL.Settings.Calendars.Label",
    hint: "SDL.Settings.Calendars.Hint",
    icon: "fa-solid fa-calendar-plus",
    type: CalendarsMenu,
    restricted: true
  });

  game.settings.register(MODULE_ID, "animate", {
    name: "SDL.Settings.Animate.Name",
    hint: "SDL.Settings.Animate.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "theme", {
    name: "SDL.Settings.Theme.Name",
    hint: "SDL.Settings.Theme.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      gilded: "SDL.Settings.Theme.Gilded",
      parchment: "SDL.Settings.Theme.Parchment",
      stone: "SDL.Settings.Theme.Stone"
    },
    default: "gilded",
    onChange: theme => {
      const element = dnd5e.ui.calendar?.element;
      if ( element ) element.dataset.theme = theme;
    }
  });

  game.settings.register(MODULE_ID, "seasonTrim", {
    name: "SDL.Settings.SeasonTrim.Name",
    hint: "SDL.Settings.SeasonTrim.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(SKY_TRIM_CHOICES.map(choice => [choice, `SDL.Settings.SeasonTrim.${choice.capitalize()}`])),
    default: "none",
    onChange: () => dnd5e.ui.calendar?.refresh?.()
  });

  game.settings.register(MODULE_ID, "barTrim", {
    name: "SDL.Settings.BarTrim.Name",
    hint: "SDL.Settings.BarTrim.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(BAR_TRIM_CHOICES.map(choice => [choice, `SDL.Settings.BarTrim.${choice.capitalize()}`])),
    default: "none",
    onChange: () => dnd5e.ui.calendar?.refresh?.()
  });

  game.settings.register(MODULE_ID, "sceneDarkness", {
    name: "SDL.Settings.SceneDarkness.Name",
    hint: "SDL.Settings.SceneDarkness.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => syncDarkness()
  });

  game.settings.register(MODULE_ID, "seasonalDaylight", {
    name: "SDL.Settings.SeasonalDaylight.Name",
    hint: "SDL.Settings.SeasonalDaylight.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      dnd5e.ui.calendar?.refresh?.();
      syncDarkness();
    }
  });

  game.settings.register(MODULE_ID, "announceDays", {
    name: "SDL.Settings.AnnounceDays.Name",
    hint: "SDL.Settings.AnnounceDays.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "expanded", {
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "offeredToEnable", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  patchDaylight(CONFIG.time.worldCalendarClass);
  registerDarknessHooks();
  registerChatCommands();
  registerAnnouncements();

  const CalendarHUD = dnd5e.applications?.calendar?.CalendarHUD;
  if ( !CalendarHUD ) {
    console.error(`${MODULE_ID} | D&D 5e's calendar HUD was not found, so the calendar can't be shown.`);
    return;
  }
  CONFIG.DND5E.calendar.application = createCalendarHUD(CalendarHUD);

  game.modules.get(MODULE_ID).api = { moons: foundry.utils.deepClone(MOONS), suns: foundry.utils.deepClone(SUNS), sky,
    darknessNow };
});

/* -------------------------------------------- */

Hooks.once("setup", () => {
  /**
   * A hook event that fires once, before the calendar is first drawn, to let modules and world scripts change the
   * moons of D&D 5e's calendars or add moons for their own.
   * @function sogrom-sundial-calendar.moons
   * @param {Record<string, import("./sky.mjs").MoonConfig[]>} moons  Moons keyed by calendar, as in
   *                                                                    `CONFIG.DND5E.calendar.calendars`.
   * @param {string} calendar  The world's calendar.
   */
  const api = game.modules.get(MODULE_ID).api;
  if ( !api ) return;
  const calendar = game.settings.get("dnd5e", "calendar");
  Hooks.callAll(`${MODULE_ID}.moons`, api.moons, calendar);

  /**
   * A hook event that fires once, before the calendar is first drawn, to let modules and world scripts change the
   * suns of D&D 5e's calendars or add suns for their own. A calendar with no suns listed has the usual one.
   * @function sogrom-sundial-calendar.suns
   * @param {Record<string, import("./sky.mjs").SunConfig[]>} suns  Suns keyed by calendar, as in
   *                                                                  `CONFIG.DND5E.calendar.calendars`.
   * @param {string} calendar  The world's calendar.
   */
  Hooks.callAll(`${MODULE_ID}.suns`, api.suns, calendar);
});

/* -------------------------------------------- */

Hooks.once("ready", () => {
  migrateSeasonTrim();
  offerToEnable();
});

/* -------------------------------------------- */

/**
 * Dressing the sky for the season was once on or off. Carry a world's old choice over: on follows the seasons.
 */
async function migrateSeasonTrim() {
  if ( !game.user.isActiveGM ) return;
  const choice = game.settings.get(MODULE_ID, "seasonTrim");
  if ( SKY_TRIM_CHOICES.includes(choice) ) return;
  const on = (choice === true) || (choice === "true");
  await game.settings.set(MODULE_ID, "seasonTrim", on ? "follow" : "none");
}

/* -------------------------------------------- */

/**
 * D&D 5e only shows a calendar once its GM turns the calendar on. Offer to, once per world, the first time a GM
 * loads it with the module active.
 */
async function offerToEnable() {
  if ( !game.user.isActiveGM || game.settings.get(MODULE_ID, "offeredToEnable") ) return;
  const config = game.settings.get("dnd5e", "calendarConfig");
  if ( config?.enabled ) return;
  await game.settings.set(MODULE_ID, "offeredToEnable", true);
  const enable = await foundry.applications.api.DialogV2.confirm({
    window: { title: "SDL.Enable.Title", icon: "fa-solid fa-calendar-days" },
    content: `<p>${_loc("SDL.Enable.Content")}</p><p>${_loc("SDL.Enable.Recovery")}</p>`,
    yes: { label: "SDL.Enable.Yes", icon: "fa-solid fa-check" },
    no: { label: "SDL.Enable.No" },
    rejectClose: false
  });
  if ( enable ) await game.settings.set("dnd5e", "calendarConfig", { ...config.toObject(), enabled: true });
}
