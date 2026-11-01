import { MODULE_ID } from "./constants.mjs";

/**
 * Calendars the module adds to D&D 5e's, for settings D&D 5e doesn't cover. The GM ticks the ones the world wants in
 * the Additional Calendars menu, and each ticked one becomes a choice in D&D 5e's Configure Calendar. Adding a
 * calendar here, with its strings in the language file and its moons in `moons.mjs`, adds it to the menu.
 */

/* -------------------------------------------- */
/*  Calendars                                   */
/* -------------------------------------------- */

/**
 * The Exandrian calendar of Tal'Dorei Campaign Setting Reborn and Explorer's Guide to Wildemount: 328 days in eleven
 * months of uneven length, with holidays on ordinary days. The seasons start on the holidays that mark them: the
 * Renewal Festival, Zenith, Harvest's Close and Barren Eve. Tal'Dorei Reborn is set in 836 PD.
 */
export const CALENDAR_OF_EXANDRIA = {
  name: "Exandrian Calendar",
  years: {
    yearZero: 836,
    firstWeekday: 0
  },
  months: {
    values: [
      ["Horisal", 29], ["Misuthar", 30], ["Dualahei", 30], ["Thunsheer", 31], ["Unndilar", 28], ["Brussendar", 31],
      ["Sydenstar", 32], ["Fessuran", 29], ["Quenpillar", 27], ["Cuersaar", 29], ["Duscar", 32]
    ].map(([name, days], i) => ({ name: `SDL.Calendar.Exandria.Month.${name}`, ordinal: i + 1, days }))
  },
  days: {
    values: ["Miresen", "Grissen", "Whelsen", "Conthsen", "Folsen", "Yulisen", "Daleysen"]
      .map((name, i) => ({ name: `SDL.Calendar.Exandria.Day.${name}`, ordinal: i + 1 })),
    daysPerYear: 328,
    hoursPerDay: 24,
    minutesPerHour: 60,
    secondsPerMinute: 60
  },
  seasons: {
    values: [
      { name: "SDL.Calendar.Exandria.Season.Spring", dayStart: 71, dayEnd: 144 }, // 13 Dualahei–25 Unndilar
      { name: "SDL.Calendar.Exandria.Season.Summer", dayStart: 145, dayEnd: 212 }, // 26 Unndilar–2 Fessuran
      { name: "SDL.Calendar.Exandria.Season.Autumn", dayStart: 213, dayEnd: 296 }, // 3 Fessuran–1 Duscar
      { name: "SDL.Calendar.Exandria.Season.Winter", dayStart: 297, dayEnd: 70 } // 2 Duscar–12 Dualahei
    ]
  },
  festivals: [
    ["NewDawn", 1, 1], ["Hillsgold", 1, 27],
    ["DayOfChallenging", 2, 7],
    ["RenewalFestival", 3, 13], ["WildsGrandeur", 3, 20],
    ["HarvestsRise", 4, 11], ["MerryfrondsDay", 4, 31],
    ["DeepSolace", 5, 8], ["Zenith", 5, 26],
    ["ArtisansFaire", 6, 15], ["Elvendawn", 6, 20],
    ["Highsummer", 7, 7], ["MornOfLargesse", 7, 14],
    ["HarvestsClose", 8, 3],
    ["HazelFestival", 9, 10], ["CivilizationsDawn", 9, 22],
    ["NightOfAscension", 10, 13], ["ZansCup", 10, 21],
    ["BarrenEve", 11, 2], ["Embertide", 11, 5], ["WintersCrest", 11, 20]
  ].map(([name, month, day]) => ({ name: `SDL.Calendar.Exandria.Festival.${name}`, month, day }))
};

/**
 * The Solamnic calendar of Dragonlance: Shadow of the Dragon Queen, used around Kalaman: twelve months of four
 * seven-day weeks, matching the months of our own year. The adventure is set in 351 AC.
 */
export const CALENDAR_OF_KRYNN = {
  name: "Solamnic Calendar",
  years: {
    yearZero: 351,
    firstWeekday: 0
  },
  months: {
    values: [
      "Newkolt", "Deepkolt", "Brookgreen", "Yurthgreen", "Fleurgreen", "Holmswelt",
      "Fierswelt", "Paleswelt", "Reapember", "Gildember", "Darkember", "Frostkolt"
    ].map((name, i) => ({ name: `SDL.Calendar.Krynn.Month.${name}`, ordinal: i + 1, days: 28 }))
  },
  days: {
    values: ["Linaras", "Palast", "Magetag", "Kirinor", "Misham", "Bakukal", "Bracha"]
      .map((name, i) => ({ name: `SDL.Calendar.Krynn.Day.${name}`, ordinal: i + 1 })),
    daysPerYear: 336,
    hoursPerDay: 24,
    minutesPerHour: 60,
    secondsPerMinute: 60
  },
  seasons: {
    values: [
      { name: "SDL.Calendar.Krynn.Season.Spring", monthStart: 3, monthEnd: 5 }, // Brookgreen–Fleurgreen
      { name: "SDL.Calendar.Krynn.Season.Summer", monthStart: 6, monthEnd: 8 }, // Holmswelt–Paleswelt
      { name: "SDL.Calendar.Krynn.Season.Autumn", monthStart: 9, monthEnd: 11 }, // Reapember–Darkember
      { name: "SDL.Calendar.Krynn.Season.Winter", monthStart: 12, monthEnd: 2 } // Frostkolt–Deepkolt
    ]
  }
};

/* -------------------------------------------- */

/**
 * @typedef AdditionalCalendar
 * @property {string} label      The calendar's name in Configure Calendar and the menu, as a localization key.
 * @property {string} hint       What it's for, in the menu, as a localization key.
 * @property {object} config     Foundry's calendar config.
 * @property {() => typeof foundry.data.CalendarData} cls  The calendar's class, made once D&D 5e has loaded.
 */

/**
 * The calendars the GM can add, keyed by their value in `CONFIG.DND5E.calendar.calendars`.
 * @type {Record<string, AdditionalCalendar>}
 */
export const CALENDARS = {
  exandria: {
    label: "SDL.Calendar.Exandria.Name",
    hint: "SDL.Calendar.Exandria.Hint",
    config: CALENDAR_OF_EXANDRIA,
    // The Harptos class gives D&D 5e's festival lookup, so the module finds the holidays. Harptos writes a festival's
    // name in place of its date, as its festivals are days outside the months; Exandria's own formats keep the date.
    cls: () => formattedClass(dnd5e.dataModels.calendar.CalendarHarptos, {
      monthDay: "SDL.Calendar.Exandria.Format.MonthDay",
      monthDayYear: "SDL.Calendar.Exandria.Format.MonthDayYear"
    })
  },
  krynn: {
    label: "SDL.Calendar.Krynn.Name",
    hint: "SDL.Calendar.Krynn.Hint",
    config: CALENDAR_OF_KRYNN,
    cls: () => formattedClass(dnd5e.dataModels.calendar.CalendarData5e, {
      monthDay: "SDL.Calendar.Krynn.Format.MonthDay",
      monthDayYear: "SDL.Calendar.Krynn.Format.MonthDayYear"
    })
  }
};

/* -------------------------------------------- */
/*  Calendar Classes                            */
/* -------------------------------------------- */

/**
 * A D&D 5e calendar class that writes dates with the calendar's own formats.
 * @param {typeof foundry.data.CalendarData} Base  D&D 5e's calendar class to build on.
 * @param {{monthDay: string, monthDayYear: string}} formats  The localization keys of the calendar's date formats.
 * @returns {typeof Base}
 */
function formattedClass(Base, formats) {
  const { CalendarData5e } = dnd5e.dataModels.calendar;
  return class extends Base {
    /** @override */
    static formatMonthDay(calendar, components, options) {
      return CalendarData5e.formatLocalized(formats.monthDay, calendar, components, options);
    }

    /** @override */
    static formatMonthDayYear(calendar, components, options) {
      return CalendarData5e.formatLocalized(formats.monthDayYear, calendar, components, options);
    }
  };
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/**
 * Register the setting that holds the GM's choice of additional calendars, once. D&D 5e picks the world's calendar
 * during its own `init`, before the module's, so this is called from the hook D&D 5e calls then, as well as from the
 * module's `init`.
 */
export function registerCalendarsSetting() {
  if ( game.settings.settings.has(`${MODULE_ID}.calendars`) ) return;
  game.settings.register(MODULE_ID, "calendars", {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
}

/**
 * The additional calendars the GM has ticked.
 * @returns {string[]}  Their keys in {@link CALENDARS}.
 */
export function chosenCalendars() {
  const chosen = game.settings.get(MODULE_ID, "calendars") ?? {};
  return Object.keys(CALENDARS).filter(key => chosen[key]);
}

/**
 * Add the ticked calendars to D&D 5e's, just before it picks the world's one. A calendar some other module has
 * already added under the same key is left as it is.
 */
export function addCalendars() {
  registerCalendarsSetting();
  const calendars = CONFIG.DND5E.calendar.calendars;
  for ( const key of chosenCalendars() ) {
    if ( calendars.some(c => c.value === key) ) continue;
    const { label, config, cls } = CALENDARS[key];
    calendars.push({ value: key, label, config, class: cls() });
  }
}
