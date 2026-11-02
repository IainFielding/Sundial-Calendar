# Changelog

All notable changes to Sundial Calendar.

## 2.0.0 — Unreleased

### New

- **Scenes can be left off the sky.** With **Darken Scenes at Night** on, each scene has **Follow the Sky** in its
  configuration, on the **Environment** tab under **Darkness**. Untick it for a dungeon, the Underdark or anywhere
  else with no sky, and its darkness stays as you set it, without locking it.
- **Warm light at dawn and dusk.** While the scene's darkness follows the sky, its light turns pale gold around
  sunrise and deep amber around sunset, coming and going with the darkness. Each player's Foundry works it out for
  itself, so nothing is saved to the scene, and a scene with a tint of its own keeps it. **Warm Light at Dawn and
  Dusk** turns it off.
- **The weather in the sky.** Set a scene's weather and the sky shows it: clouds drifting past the sun and moons, and
  rain, a storm with lightning, snow, a blizzard, fog or autumn leaves. Each player sees the weather of the scene
  they're looking at, and can turn it off with **Show the Weather in the Sky**.

### Changed

- **A cleaner sky.** The day wheel is bigger and the band of night sky round it thinner, with one dashed ring
  marking the path the sun and moons take. The rays and rings on the wheel's face are gone, and its hour notches are
  gold like its rim, longer at midnight, dawn, noon and dusk.
- **Simple D&D Calendar is now Sundial Calendar.** The module has a new name, a new module id
  (`sogrom-sundial-calendar`) and a new home at <https://github.com/IainFielding/Sundial-Calendar>. Foundry sees it
  as a new module: uninstall Simple D&D Calendar, install Sundial Calendar from its manifest URL and set its options
  again. See [Upgrading from Simple D&D Calendar](README.md#upgrading-from-simple-dd-calendar).
- **For module and world script authors:** the hooks are now `sogrom-sundial-calendar.moons` and
  `sogrom-sundial-calendar.suns`, the settings live under `sogrom-sundial-calendar`, and the calendar's CSS classes,
  ids and custom properties start `sdl-` in place of `sdc-` (`#sdl-calendar`, `--sdl-gold` and so on).

## 1.6.1 — 2026-11-01

### Changed

- **Dawn and dusk blend more smoothly on the day wheel.** The day's colour fades into the night across the hour either
  side of sunrise and sunset, under a glow that is brightest at sunrise and sunset, without visible bands. The gold
  line that marked sunrise and sunset is gone.

## 1.6.0 — 2026-10-27

### New

- **The sun crosses the sky.** It rises on the right of the bowl at sunrise, is at the bottom at noon and sets on the
  left at sunset, reddening near the horizon. A new moon passing over it eclipses it. Oerth's sun is Liga; the other
  worlds' is the Sun. Hover over it for its name.
- Modules can rename or recolour a calendar's sun, or give it more suns, in the new
  `sogrom-simple-dnd-calendar.suns` hook.
- **Dawn and dusk glow on the day wheel.** Day and night blend into each other through the hour either side of
  sunrise and sunset, with the gold line between them still marking the moment.

### Changed

- **The sun and the sky show the time of day,** in place of the dawn, day, dusk and night icons on the wheel, which
  are gone. The calendar's `data-day-phase` attribute still says which part of the day it is, for styles and modules.
- **The moons keep to the season's nights.** With **Long Summer Days** on, the moons follow the season's sun: a full
  moon rises at sunset and sets at sunrise, so it rides through a short summer night and a long winter one.

## 1.5.0 — 2026-10-23

### New

- **Additional calendars**, for settings D&D 5e doesn't cover. The GM ticks them under **Additional Calendars**, and
  they join D&D 5e's **Configure Calendar**: the **Exandrian Calendar** of Tal'Dorei and Wildemount, with its 21
  holidays and the moons Catha and Ruidus; and Dragonlance's **Solamnic Calendar**, with Solinari, Lunitari and
  Nuitari full together on the Night of the Eye every year and a half.
- **A trim for every adventure and setting.** **Dress the Bar for Your Adventure** now has a trim for every D&D
  adventure and campaign setting Wizards of the Coast has published for fifth edition, 48 in all, listed by name:
  from Lost Mine of Phandelver, Storm King's Thunder and Waterdeep: Dragon Heist to Candlekeep Mysteries, Keys from
  the Golden Vault and Dragon Delves; and for the Forgotten Realms, Eberron, Exandria, Ravnica, Theros, Strixhaven,
  Spelljammer, Dragonlance, Planescape, Greyhawk, Lorwyn-Shadowmoor and Netheril. A setting and its adventures share
  a trim. Curse of Strahd's now covers Ravenloft too.
- **Every Exandrian holiday dresses the sky.** Fourteen new trims for the sky, from New Dawn's sunrise and the
  Day of Challenging's storm to Barren Eve's candles and Embertide's embers; the other seven holidays share the
  festivals' trims, as the Renewal Festival shares Greengrass's.
- **Trims and Styles**, a page in the docs with a picture of every trim for the bar and the sky, and each style.

### Changed

- **Eberron's moons follow their months.** As *Rising from the Last War* names each month for the moon closest to
  the world then, each of the twelve moons is full in the middle of its own month in 998 YK.
- The module's artwork on Foundry's setup screen shows the calendar as it comes, on a spring evening.

## 1.4.0 — 2026-10-23

### New

- **The Tears of Selûne** glitter after her across the bowl, fading as the sky grows light. Modules can give any
  moon the same trail with `trail: "tears"` in the `sogrom-simple-dnd-calendar.moons` hook.
- **Works with Tomb of Annihilation.** The GM's Adventure Tracker button, which the adventure adds to D&D 5e's
  calendar, sits on the bar with the other buttons.

## 1.3.0 — 2026-10-23

### New

- **Festivals dress the sky** for the day while it follows the seasons: holly and bells for Midwinter, grass and
  daisies for Greengrass, lanterns for Midsummer, bunting and shields for Shieldmeet, wheat and apples for
  Highharvestide, and moonflowers for the Feast of the Moon, and likewise for Greyhawk's festival weeks.
- **Dress the Bar for Your Adventure**, a trim for the bar, alongside the sky's: Curse of Strahd, The Wild Beyond
  the Witchlight, Descent into Avernus, Rime of the Frostmaiden, Arcana Unleashed, Arcana Unleashed: Deadfall, World
  of Warcraft, Vecna: Eve of Ruin, Tomb of Annihilation, and Phandelver and Below: The Shattered Obelisk.

### Changed

- **Dress the Frame for the Season** is now **Dress the Sky for the Season**, and dresses only the sky's rim, about
  the day wheel. It is a choice: None, Follow the Seasons, or Just Winter, Spring, Summer or Autumn to keep one
  season's trim all year. Worlds that had it on now follow the seasons.

## 1.2.0 — 2026-10-22

### New

- **Scenes darken at night.** Turn on **Darken Scenes at Night** and the active scene's darkness follows the sky:
  the light fades through the late afternoon and twilight by the height of the sun, and a bright moon lifts the dark
  of night a little. Scenes with their darkness locked are left alone.
- **Long summer days.** Turn on **Long Summer Days** and sunrise and sunset move with the seasons, from sixteen hours
  of daylight at midsummer to eight at midwinter. The day wheel, the scene's darkness, and D&D 5e's dawn and dusk
  recovery all follow.
- **Chat commands.** `/date` whispers you the date, the season, any festival and the moons' phases. The GM can move
  the time with `/advance` and `/rewind`, by an amount (`/advance 8 hours`, `/rewind 1d 6h`) or to the next or last
  dawn, noon, dusk or midnight (`/advance dawn`).
- **Each dawn in the chat.** Turn on **Announce Each Dawn** and each new day is posted as the sun rises, with its
  date, the start of a season and any festival.
- **Full and new moons are marked** beside the bowl on the day they fall, and so are moons full together, such as
  Luna and Celene on Needfest. `/date` and the dawn in the chat say so too.
- **When's the next full moon?** Hover the season band for each moon's phase and the date it is next full.
- **Calendar styles.** Each player can pick **Gilded Night** (the default), **Parchment** or **Underdark** under
  **Calendar Style**.

### Changed

- The bar is solid in every style, rather than letting the scene show through.

## 1.1.0 — 2026-10-22

### New

- **The frame dressed for the season**: frost and icicles in winter, a flowering vine in spring, sunflowers in
  summer, and fallen leaves in autumn. Off by default; the GM can turn it on with **Dress the Frame for the Season**.

## 1.0.0 — 2026-10-22

### New

- **A new look for D&D 5e's calendar.** A framed bar across the top of the screen with the day and the time, a band
  of the year's seasons beneath it showing the date, and a bowl of sky with a day wheel that turns through the day.
- **Moons** for each of D&D 5e's calendars, showing their phases as they cross the sky: Selûne; Luna and Celene; the
  twelve moons of Eberron; and Earth's Moon.
- **Festival days** marked beside the bowl.
- **Changes of time play out**, with the clock running and the wheel and moons moving, unless **Animate Time
  Changes** is turned off.
- **The sky can be hidden**, leaving just the bar, and each player's choice is remembered.
- **Uses the calendar the GM picked** in D&D 5e's calendar settings.
- The GM is offered to turn D&D 5e's calendar on, the first time they load a world with the module.
