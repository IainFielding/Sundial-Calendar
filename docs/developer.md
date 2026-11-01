# Developer Guide

How to integrate a module or world script with Sundial Calendar: adding your own calendar to D&D 5e, giving it moons, and working with the calendar bar.

The module id is `sogrom-sundial-calendar`. Everything here targets Foundry VTT 14 and D&D 5e 6.x.

## How the pieces fit

| | Owned by | How you change it |
| --- | --- | --- |
| The calendars: years, months, weekdays, seasons, festivals, sunrise and sunset | D&D 5e (built on Foundry's `CalendarData`) | Register a calendar in the `dnd5e.setupCalendar` hook |
| The calendar bar's buttons | D&D 5e | The `dnd5e.prepareCalendarButtons` hook |
| The moons | Sundial Calendar | The `sogrom-sundial-calendar.moons` hook |
| The suns | Sundial Calendar | The `sogrom-sundial-calendar.suns` hook |
| The sky, trims, darkness, chat commands and announcements | Sundial Calendar | Read from your calendar: see [What the module reads from a calendar](#what-the-module-reads-from-a-calendar) |

So a new calendar takes two steps. Register it with D&D 5e, which makes it a choice in **Configure Calendar** and gives it festivals and seasons. Then give it moons through this module. The two are independent: your calendar works without this module, and the moons are only drawn when it's active.

## Adding a calendar to D&D 5e

D&D 5e keeps its calendars in `CONFIG.DND5E.calendar.calendars`, and picks the world's one during its own `init`. A module's `init` runs after the system's, which is too late. Add yours in the `dnd5e.setupCalendar` hook, which D&D 5e calls just before it picks:

```js
Hooks.once("dnd5e.setupCalendar", () => {
  CONFIG.DND5E.calendar.calendars.push({
    value: "sundered-isles",                       // Stored in the world's "dnd5e.calendar" setting.
    label: "SUNDERED.Calendar.Name",                // Shown in Configure Calendar; localized for you.
    config: CALENDAR_OF_THE_SUNDERED_ISLES,         // The calendar itself: see below.
    class: dnd5e.dataModels.calendar.CalendarHarptos  // Optional. CalendarHarptos adds festival days.
  });
});
```

Register the hook at the top level of your script, not inside your own `init`: by the time a module's `init` runs, D&D 5e has already called it. Returning `false` from the hook stops D&D 5e from setting up any calendar, so return nothing.

The GM then picks your calendar under **Configure Settings → Configure Calendar → Calendar**, and the world reloads.

### The calendar's config

`config` is Foundry's calendar config:

```js
const CALENDAR_OF_THE_SUNDERED_ISLES = {
  name: "Calendar of the Sundered Isles",
  years: {
    yearZero: 812,              // The year shown for the world's time 0.
    firstWeekday: 0,            // The weekday, counted from 0, that year zero starts on.
    leapYear: { leapStart: 0, leapInterval: 4 }  // Optional. Months with leapDays use them in leap years.
  },
  months: {
    values: [
      { name: "SUNDERED.Month.Tidewane", abbreviation: "SUNDERED.Month.TidewaneShort", ordinal: 1, days: 30 },
      { name: "SUNDERED.Month.Saltmoot", ordinal: 2, days: 30 },
      { name: "SUNDERED.Month.Brightwater", ordinal: 3, days: 31, leapDays: 32 },
      // ...one entry per month, in order. Ordinals count from 1.
    ]
  },
  days: {
    values: [
      { name: "SUNDERED.Day.Firstday", ordinal: 1 },
      // ...one entry per weekday.
    ],
    daysPerYear: 365,
    hoursPerDay: 24,
    minutesPerHour: 60,
    secondsPerMinute: 60
  },
  seasons: {
    values: [
      // By day of the year, which Foundry counts from 1, both ends included. A season may run over the new year.
      { name: "SUNDERED.Season.Spring", dayStart: 79, dayEnd: 171 },
      { name: "SUNDERED.Season.Summer", dayStart: 172, dayEnd: 263 },
      { name: "SUNDERED.Season.Autumn", dayStart: 264, dayEnd: 353 },
      { name: "SUNDERED.Season.Winter", dayStart: 354, dayEnd: 78 }
      // Or by month, by the months' ordinals: { name, monthStart: 3, monthEnd: 5 }.
    ]
  },
  // Only read by CalendarHarptos: see Festivals.
  festivals: [
    { name: "SUNDERED.Festival.Midwinter", month: 1, day: 31 }
  ]
};
```

D&D 5e's own calendars are good references, in `module/data/calendar/` in the D&D 5e source: `calendar-of-harptos.mjs` (leap days and festival days), `calendar-of-greyhawk.mjs` (festival weeks as months) and `calendar-of-khorvaire.mjs` (the simplest).

### The calendar's class

| Class | Use it for |
| --- | --- |
| `dnd5e.dataModels.calendar.CalendarData5e` | The default, used when you leave `class` out. Adds D&D 5e's formatters, and sunrise at a quarter of the day and sunset at three-quarters. |
| `dnd5e.dataModels.calendar.CalendarHarptos` | Festival days that fall between months, read from `festivals` in the config. |
| A subclass of either | Your own date formats, festival rules, or sunrise and sunset. |

Sunrise and sunset come from the class's `sunrise(time)` and `sunset(time)`, which return hours. Override them for a calendar with its own day length:

```js
class CalendarSunderedIsles extends dnd5e.dataModels.calendar.CalendarHarptos {
  sunrise(time = game.time.components) { return 5; }
  sunset(time = game.time.components) { return 19; }
}
```

Define the class inside the hook, or anywhere `dnd5e.dataModels` already exists: D&D 5e's script sets it up when it loads, before any module's script.

### Festivals

Sundial Calendar finds a day's festival in either of D&D 5e's two ways:

- **A festival day.** With a class that has `findFestivalDay(components)`, such as `CalendarHarptos`, each entry in `festivals` is a day, by month and day of the month, both counted from 1. Harptos puts its festivals on the extra day at the end of a 31-day month.
- **A festival month.** Any month whose `name` is a localization key containing `.Festival.`, such as `"SUNDERED.Festival.Lanternweek"`, is a festival for all its days. This is how Greyhawk's festival weeks work.

The festival's name is shown with the marker beside the bowl, in `/date`, and in the dawn announcements.

A festival day can also fall on an ordinary day of a month, as the module's Exandrian calendar does. `CalendarHarptos` then still finds it, but writes the festival's name in place of the date; override `formatMonthDay` and `formatMonthDayYear` to keep the date.

### The module's own calendars

The module adds calendars of its own, which the GM ticks in the **Additional Calendars** menu: `exandria` and `krynn`, their values in `CONFIG.DND5E.calendar.calendars` and the world's `dnd5e.calendar` setting. They're added in the same `dnd5e.setupCalendar` hook, and only those ticked, so a module that registers a calendar under the same value first keeps its own.

To add another to the module, add it to `CALENDARS` in `scripts/calendars.mjs`, with its strings in `lang/en.json` and its moons in `scripts/moons.mjs` under the same key. The menu lists it from there.

## Adding moons

Give your calendar moons in the `sogrom-sundial-calendar.moons` hook. It fires once, during Foundry's `setup`, before the calendar first draws. It's passed every calendar's moons, keyed by the same `value` you registered the calendar under, and the world's calendar:

```js
Hooks.on("sogrom-sundial-calendar.moons", (moons, calendar) => {
  moons["sundered-isles"] = [
    {
      id: "pallid",
      name: "SUNDERED.Moon.Pallid",
      period: 27.5,
      color: "#eaeef7",
      epoch: { year: 812, day: 0 },   // Midnight starting the first day of 812...
      epochPhase: 0.5                 // ...the Pallid Moon was full.
    },
    {
      id: "ember",
      name: "SUNDERED.Moon.Ember",
      period: 61,
      color: "#f09a6b",
      epoch: { year: 812, day: 14, hour: 6 },
      epochPhase: 0,                  // New at 06:00 on day 15 of 812.
      trail: "tears"                  // A trail of glints behind it, like the Tears of Selûne.
    }
  ];
});
```

If Sundial Calendar isn't installed or active, the hook never fires, so this is safe in a module that only recommends it.

### Moon fields

| Field | | |
| --- | --- | --- |
| `id` | Required | A key for the moon, unique within its calendar. |
| `name` | Required | Its name, or a localization key for it. |
| `period` | Required | Days from one new moon to the next. Fractions are fine: Selûne's is `30.4375`. |
| `color` | Required | The colour of its lit face, as `#rrggbb`. Its glow is drawn from this too. |
| `epoch` | Required | A moment its phase is known: `{ year, day, hour }`. `year` is as the calendar shows it, `day` is the day of that year counted from 0, and `hour` (default 0) may be negative or more than a day's hours to land between days. |
| `epochPhase` | Optional | Its phase at the epoch: `0` new (the default), `0.25` first quarter, `0.5` full, `0.75` last quarter. |
| `trail` | Optional | `"tears"` draws the Tears of Selûne's trail of glints behind it. |

### Choosing an epoch

Pick any moment you know a moon's phase. The easiest is a full moon on a date that matters in your setting: put that date in `epoch` and `0.5` in `epochPhase`. The module works out every other date from there, forwards and backwards.

To check your numbers, set the world to the date and look at the moon, or run `/date`. Hovering over the seasonal timeline shows each moon's phase and its next full moon.

A period that divides the year exactly keeps the moon's phases on the same dates every year. Zarantyr, at 28 days in a year of twelve 28-day months, is full on the 15th of every month. Any other period drifts through the calendar. [The Moons](moons.md) describes how each built-in calendar behaves.

### Changing the built-in moons

The same hook can change D&D 5e's calendars' moons:

```js
Hooks.on("sogrom-sundial-calendar.moons", moons => {
  moons.greyhawk.find(m => m.id === "luna").period = 28;    // Change one.
  moons.harptos[0].trail = undefined;                       // Take the Tears away.
  moons.gregorian = [];                                     // No moon at all.
});
```

The built-in keys are `gregorian`, `greyhawk`, `harptos` and `khorvaire`, and the moons are listed in [The Moons](moons.md).

## Changing the suns

Every world has a sun, so a calendar with none listed gets the usual one: yellow, named "The Sun". To name, recolour or resize it, or to give a world more than one, use the `sogrom-sundial-calendar.suns` hook. It fires during `setup`, just after the moons' hook, and is passed every calendar's suns keyed the same way, and the world's calendar:

```js
Hooks.on("sogrom-sundial-calendar.suns", suns => {
  suns["sundered-isles"] = [
    { id: "ember", name: "The Ember", color: "#ffb347", size: 1.1 },
    { id: "spark", name: "The Spark", color: "#cfe8ff", size: 0.6, offset: 2 }   // Rises two hours after the Ember.
  ];
  suns.gregorian = [];                                                          // No sun at all.
});
```

Each sun rises at the calendar's sunrise and sets at its sunset, as the day wheel shows them, unless it has an `offset`.

### Sun fields

| Field | | |
| --- | --- | --- |
| `id` | Required | A key for the sun, unique within its calendar. |
| `name` | Required | Its name, or a localization key for it. |
| `color` | Required | Its colour high in the sky, as `#rrggbb`. It reddens towards the horizon, and its glow is drawn from it too. |
| `size` | Optional | Its size against the usual sun's, by default `1`. |
| `offset` | Optional | Hours it rises and sets after the calendar's sunrise and sunset, by default `0`; negative to rise before. Only the calendar's own sunrise and sunset set the day wheel, the darkness and dawn. |

The built-in suns are in `scripts/suns.mjs`.

## What the module reads from a calendar

Sundial Calendar works with any calendar D&D 5e can use. These are the parts it reads, and what a calendar without them gets:

| What | Read from | Without it |
| --- | --- | --- |
| Festivals | `findFestivalDay`, or month names containing `.Festival.` | No festivals. |
| Festival decorations | The last part of the festival's key: `…Midwinter` or `…Needfest`, `…Greengrass` or `…Growfest`, `…Midsummer` or `…Richfest`, `…Shieldmeet`, `…Highharvestide` or `…Brewfest`, `…FeastOfTheMoon` | Your festival gets no decoration of its own, and the sky keeps the season's. |
| Season colours and decorations | A word in each season's name: spring, summer, autumn or fall, winter (and seeding, planting, blooming, steading, harvest, gleaning, withering, stilling). Localization keys count, so `SUNDERED.Season.Autumn` is an autumn. | A season it can't place gets a colour from a fixed set, and no decoration. |
| Midsummer, for **Long Summer Days** | The seasons: halfway from the start of spring to the start of autumn, or else the start of summer, or half a year from the start of winter | With the setting on, every day is half daylight and half night. |
| Sunrise and sunset | The class's `sunrise()` and `sunset()` | The 25% and 75% of D&D 5e's default. |
| Weekdays | `days.values` | The `/date` reply and dawn announcements leave the weekday out. |
| The date and time as written | D&D 5e's formatters, chosen by each user in **Calendar Preferences** | |

With **Long Summer Days** on, the module wraps the world calendar class's `sunrise()` and `sunset()` with its own seasonal ones. Your overrides are still used while the setting is off.

## The calendar bar

### Adding buttons

The bar is D&D 5e's calendar, restyled, so buttons added through D&D 5e's hook appear on it:

```js
Hooks.on("dnd5e.prepareCalendarButtons", (app, buttons) => {
  buttons.push({
    action: "sunderedWeather",
    icon: "fa-solid fa-cloud-sun-rain",
    position: "end",                  // "start" sits left of the date, "end" right.
    tooltip: "Roll the weather",
    visible: () => game.user.isGM,
    onClick: event => rollWeather()
  });
});
```

A button can have a drop-down of `additional` buttons, which show when it's hovered, as Rewind and Advance do.

### Refreshing the bar

After you change something the calendar draws from, redraw it:

```js
dnd5e.ui.calendar?.refresh?.();
```

### Styling

The calendar is `#sdl-calendar`, which carries:

| Attribute or class | Set to |
| --- | --- |
| `data-theme` | The user's **Calendar Style**: `gilded`, `parchment` or `stone`. |
| `data-sky-trim` | The sky's decoration: a season (`winter`, `spring`, `summer`, `fall`), a festival (`midwinter`, `greengrass`, `midsummer`, `shieldmeet`, `harvest`, `moonfeast`), or empty. |
| `data-bar-trim` | The adventure trim's key, such as `ravenloft`, or empty. |
| `data-day-phase` | The part of the day: `dawn` (the hour before sunrise), `day`, `dusk` (the hour after sunset) or `night`. |
| `.expanded` | Present while the calendar is open, absent while it's folded up to the bar. |

Moons are `.sdl-moon` elements in `.sdl-moons`, with their colour in `--moon-color`. The Tears are `.sdl-tears`. Suns are `.sdl-sun` elements in the same container, before the moons, with their colour at the moment in `--sun-color`.

## The module's API

`game.modules.get("sogrom-sundial-calendar").api`, available from `init`, has:

| Property | |
| --- | --- |
| `moons` | Every calendar's moons, as the `.moons` hook leaves them. Change them in the hook instead: the calendar reads them when it first draws. |
| `suns` | Every calendar's suns, as the `.suns` hook leaves them. |
| `sky` | The sky's maths, such as `sky.moonPhase(calendar, moon, time)` (0 new, 0.5 full), `sky.phaseName(phase)`, `sky.nextFullMoon(calendar, moon, time)` and `sky.darkness(hour, sunrise, sunset, hoursPerDay, moonlight)`. |
| `darknessNow()` | The darkness, from 0 to 1, that **Darken Scenes at Night** would give the active scene at the current time. Use it to keep other scenes, or your own lighting, in step. |

For example, the Pallid Moon's phase now:

```js
const { moons, sky } = game.modules.get("sogrom-sundial-calendar").api;
const pallid = moons["sundered-isles"].find(m => m.id === "pallid");
const phase = sky.moonPhase(game.time.calendar, pallid, game.time.worldTime);
console.log(sky.phaseName(phase));   // "Full", "WaxingCrescent"...
```

### Settings

The module's settings can be read with `game.settings.get("sogrom-sundial-calendar", key)`:

| Key | Scope | Values |
| --- | --- | --- |
| `animate` | Client | `true` or `false` |
| `theme` | Client | `"gilded"`, `"parchment"` or `"stone"` |
| `seasonTrim` | World | `"none"`, `"follow"`, `"winter"`, `"spring"`, `"summer"` or `"fall"` |
| `barTrim` | World | `"none"` or an adventure's key |
| `sceneDarkness` | World | `true` or `false` |
| `seasonalDaylight` | World | `true` or `false` |
| `announceDays` | World | `true` or `false` |
| `calendars` | World | The additional calendars ticked, such as `{ exandria: true, krynn: false }` |

### Chat commands

The module handles `/date`, `/advance` and `/rewind` in Foundry's `chatMessage` hook, and returns `false` for them so they aren't posted. A module that uses the same commands will clash with it.

## A complete example

A module that adds the Calendar of the Sundered Isles, with two moons.

`module.json`:

```json
{
  "id": "sundered-isles-calendar",
  "title": "Calendar of the Sundered Isles",
  "version": "1.0.0",
  "compatibility": { "minimum": "14", "verified": "14" },
  "esmodules": ["scripts/calendar.mjs"],
  "languages": [{ "lang": "en", "name": "English", "path": "lang/en.json" }],
  "relationships": {
    "systems": [{ "id": "dnd5e", "type": "system", "compatibility": { "minimum": "6.0.0" } }],
    "recommends": [{ "id": "sogrom-sundial-calendar", "type": "module", "reason": "Draws the calendar's moons." }]
  }
}
```

`scripts/calendar.mjs`:

```js
const CALENDAR = {
  name: "Calendar of the Sundered Isles",
  years: { yearZero: 812, firstWeekday: 0 },
  months: { values: [ /* ...your months... */ ] },
  days: { values: [ /* ...your weekdays... */ ], daysPerYear: 360, hoursPerDay: 24, minutesPerHour: 60, secondsPerMinute: 60 },
  seasons: { values: [ /* ...your seasons... */ ] },
  festivals: [ /* ...your festival days... */ ]
};

// Register with D&D 5e. This must be at the top level, not inside init.
Hooks.once("dnd5e.setupCalendar", () => {
  CONFIG.DND5E.calendar.calendars.push({
    value: "sundered-isles",
    label: "SUNDERED.Calendar.Name",
    config: CALENDAR,
    class: dnd5e.dataModels.calendar.CalendarHarptos
  });
});

// Give it moons, if Sundial Calendar is active.
Hooks.on("sogrom-sundial-calendar.moons", moons => {
  moons["sundered-isles"] = [
    { id: "pallid", name: "SUNDERED.Moon.Pallid", period: 27.5, color: "#eaeef7", epoch: { year: 812, day: 0 }, epochPhase: 0.5 },
    { id: "ember", name: "SUNDERED.Moon.Ember", period: 61, color: "#f09a6b", epoch: { year: 812, day: 14, hour: 6 }, trail: "tears" }
  ];
});
```

`lang/en.json` holds every key the calendar names, from `SUNDERED.Calendar.Name` to each month, weekday, season, festival and moon.

The same two hooks work from a world script, for a homebrew calendar in a single world.
