/**
 * End-to-end tests: the calendar in a real world, as the GM and as a player see it.
 */

import { MODULE_ID } from "./config.mjs";
import { assert, assertEqual, readCalendar, setClientSettings, setTime, test, waitFor, waitForShown } from "./lib/harness.mjs";
import { useCalendar } from "./lib/world.mjs";

/* -------------------------------------------- */
/*  Setup                                       */
/* -------------------------------------------- */

test("the calendar is the one the GM picked in D&D 5e's settings", async ({ gm, player }) => {
  try {
    for ( const [key, name, moon] of [["gregorian", "Simplified Gregorian", "moon"], ["harptos", "Calendar of Harptos", "selune"]] ) {
      await useCalendar(gm, key);
      await player.reload();
      for ( const session of [gm, player] ) {
        const shown = await session.eval(moduleId => ({
          name: game.time.calendar.name,
          moons: game.modules.get(moduleId).api.moons[game.settings.get("dnd5e", "calendar")].map(m => m.id)
        }), MODULE_ID);
        assertEqual(shown, { name, moons: [moon] }, `${session.user}'s calendar with ${key} picked`);
      }
    }
  } finally {
    if ( await useCalendar(gm, "harptos") ) await player.reload();
  }
});

test("the GM is offered to turn the calendar on, once", async ({ gm }) => {
  await gm.eval(async moduleId => {
    const config = game.settings.get("dnd5e", "calendarConfig");
    await game.settings.set("dnd5e", "calendarConfig", { ...config.toObject(), enabled: false });
    await game.settings.storage.get("world").getSetting(`${moduleId}.offeredToEnable`)?.delete();
  }, MODULE_ID);
  await gm.reload();
  const dialog = gm.page.locator(".application.dialog", { hasText: "Turn On the Calendar?" });
  await dialog.waitFor({ timeout: 10_000 });
  await dialog.locator("button[data-action=yes]").click();
  await waitFor(gm, () => game.settings.get("dnd5e", "calendarConfig").enabled, null, "the calendar to be turned on");
  await waitFor(gm, () => !!document.getElementById("sdl-calendar"), null, "the calendar to appear");

  // Loading the world again doesn't ask again.
  await gm.reload();
  await gm.page.waitForTimeout(1500);
  assertEqual(await gm.page.locator(".application.dialog", { hasText: "Turn On the Calendar?" }).count(), 0, "dialogs");
});

test("the GM adds Exandria and Krynn from the Additional Calendars menu, with their dates, holidays and moons",
  async ctx => {
    const { gm, player } = ctx;
    const openMenu = async () => {
      await gm.eval(async moduleId => {
        const { type } = game.settings.menus.get(`${moduleId}.calendarsMenu`);
        await new type().render({ force: true });
      }, MODULE_ID);
      const menu = gm.page.locator("#sdl-calendars-menu");
      await menu.waitFor({ timeout: 10_000 });
      return menu;
    };
    try {
      // Tick both, save, and decline the offer to reload, so the harness reloads each user itself.
      let menu = await openMenu();
      await menu.locator("input[name=exandria]").check();
      await menu.locator("input[name=krynn]").check();
      await menu.locator("button[type=submit]").click();
      const reloadPrompt = gm.page.locator("#reload-world-confirm");
      await reloadPrompt.waitFor({ timeout: 10_000 });
      await reloadPrompt.locator("button[data-action=no]").click();
      await gm.reload();
      const offered = await gm.eval(() => CONFIG.DND5E.calendar.calendars.map(c => c.value));
      assert(offered.includes("exandria") && offered.includes("krynn"), `Configure Calendar's choices: ${offered}`);

      // Exandria: Zenith, the first day of summer, is the 26th of Unndilar.
      await useCalendar(gm, "exandria");
      await player.reload();
      await setTime(ctx, { year: 836, day: 145, hour: 12 });
      const exandria = await readCalendar(player);
      assertEqual([exandria.date.toLowerCase(), exandria.season, exandria.festival], ["unndilar 26th", "Summer", "Zenith"],
        "Exandria's date, season and holiday");
      assertEqual(await player.eval(id => game.modules.get(id).api.moons.exandria.map(m => m.id), MODULE_ID),
        ["catha", "ruidus"], "Exandria's moons");

      // The world's calendar can't be unticked.
      menu = await openMenu();
      assertEqual(await menu.locator("input[name=exandria]").isDisabled(), true, "the box for the world's calendar");
      await gm.eval(() => foundry.applications.instances.get("sdl-calendars-menu")?.close());

      // Krynn: the three moons are full together, the Night of the Eye, as 351 AC begins.
      await useCalendar(gm, "krynn");
      await player.reload();
      await setTime(ctx, { year: 351, day: 0, hour: 0 });
      const krynn = await readCalendar(player);
      assertEqual(krynn.date.toLowerCase(), "1 newkolt", "Krynn's date");
      for ( const moon of ["Solinari", "Lunitari", "Nuitari"] ) {
        assert(krynn.moonEvents?.includes(moon), `the moons full together: ${krynn.moonEvents}`);
      }
    } finally {
      await useCalendar(gm, "harptos");
      await gm.eval(id => game.settings.set(id, "calendars", {}), MODULE_ID);
      await gm.reload();
      await player.reload();
    }
  });

/* -------------------------------------------- */
/*  Display                                     */
/* -------------------------------------------- */

test("the calendar replaces D&D 5e's and hangs from the top of the screen", async ({ gm, player }) => {
  for ( const session of [gm, player] ) {
    const shown = await session.eval(() => ({
      ours: !!document.getElementById("sdl-calendar"),
      theirs: !!document.getElementById("calendar-hud"),
      app: dnd5e.ui.calendar?.id
    }));
    assertEqual(shown, { ours: true, theirs: false, app: "sdl-calendar" }, `${session.user}'s calendar`);
    const calendar = await readCalendar(session);
    assert(calendar.inUiTop, `${session.user}'s calendar is not in #ui-top`);
    const box = await session.page.locator("#sdl-calendar").boundingBox();
    assert(Math.abs((box.x + (box.width / 2)) - 800) < 220, `the calendar is not near the middle: ${JSON.stringify(box)}`);
    assert(box.y < 5, `the calendar does not hang from the top: ${JSON.stringify(box)}`);
  }
});

test("the bar shows the day of the week and the time, and the band shows the date", async ctx => {
  await setTime(ctx, { year: 1525, day: 79, hour: 14, minute: 30 });
  const expected = await ctx.gm.eval(() => {
    const calendar = game.time.calendar;
    const components = game.time.components;
    return {
      day: _loc(calendar.days.values[components.dayOfWeek].name),
      date: calendar.format(components, "formatMonthDay")
    };
  });
  for ( const session of [ctx.gm, ctx.player] ) {
    const calendar = await readCalendar(session);
    assert(calendar.time.endsWith("14:30"), `${session.user}'s time: ${calendar.time}`);
    assert(calendar.time.toLowerCase().startsWith(expected.day.toLowerCase()), `${session.user}'s day: ${calendar.time}`);
    assertEqual(calendar.date.toLowerCase(), expected.date.toLowerCase(), `${session.user}'s date`);
  }
});

test("the date and time follow D&D 5e's calendar preferences", async ctx => {
  await ctx.player.eval(() => game.settings.set("dnd5e", "calendarPreferences", {
    visible: true, formatters: { date: "monthDayYear", time: "approximateTime" }
  }));
  await setTime(ctx, { year: 1525, day: 79, hour: 12 });
  const calendar = await waitFor(ctx.player, () => {
    const time = document.querySelector("#sdl-calendar .sdl-time")?.innerText ?? "";
    return time.endsWith("Noon") ? time : null;
  }, null, "the approximate time");
  assert(calendar.endsWith("Noon"), `player's time: ${calendar}`);
  const date = (await readCalendar(ctx.player)).date;
  assert(date.includes("1525"), `player's date has no year: ${date}`);
});

test("the day wheel turns through the day", async ctx => {
  const rotations = {};
  for ( const hour of [0, 6, 12, 18] ) {
    await setTime(ctx, { year: 1525, day: 100, hour });
    rotations[hour] = (await readCalendar(ctx.gm)).wheel;
  }
  assertEqual(rotations, { 0: "rotate(-180.00)", 6: "rotate(-90.00)", 12: "rotate(0.00)", 18: "rotate(90.00)" }, "wheel");
});

test("the calendar marks the part of the day", async ctx => {
  const phases = {};
  for ( const [hour, minute] of [[2, 0], [5, 30], [12, 0], [18, 30]] ) {
    await setTime(ctx, { year: 1525, day: 100, hour, minute });
    phases[`${hour}:${minute}`] = (await readCalendar(ctx.player)).phase;
  }
  assertEqual(phases, { "2:0": "night", "5:30": "dawn", "12:0": "day", "18:30": "dusk" }, "phases");
});

test("the season dresses the frame, festivals dress it for the day, and show beside the bowl", async ctx => {
  await ctx.gm.eval(moduleId => game.settings.set(moduleId, "seasonTrim", "follow"), MODULE_ID);
  await setTime(ctx, { year: 1525, day: 100, hour: 12 });
  let calendar = await readCalendar(ctx.gm);
  assertEqual([calendar.season, calendar.skyTrim, calendar.festival], ["Spring", "spring", null], "in Tarsakh");
  await setTime(ctx, { year: 1525, day: 30, hour: 12 });
  calendar = await readCalendar(ctx.gm);
  assertEqual([calendar.season, calendar.skyTrim, calendar.festival], ["Winter", "midwinter", "Midwinter"],
    "on Midwinter");
  await setTime(ctx, { year: 1525, day: 31, hour: 12 });
  calendar = await readCalendar(ctx.gm);
  assertEqual([calendar.skyTrim, calendar.festival], ["winter", null], "the day after");
});

test("an adventure dresses the bar, beside the season's sky", async ctx => {
  await ctx.gm.eval(async moduleId => {
    await game.settings.set(moduleId, "barTrim", "ravenloft");
    await game.settings.set(moduleId, "seasonTrim", "follow");
  }, MODULE_ID);
  await setTime(ctx, { year: 1525, day: 100, hour: 12 });
  await waitFor(ctx.player, () => document.getElementById("sdl-calendar")?.dataset.barTrim === "ravenloft", undefined,
    "the adventure's trim");
  const trim = await ctx.player.eval(() => {
    const root = document.getElementById("sdl-calendar");
    const pieces = selector => [...root.querySelectorAll(`${selector} > *`)].map(e => e.getAttribute("class") ?? "");
    return { bar: root.dataset.barTrim, sky: root.dataset.skyTrim,
      barHasWeb: pieces(".sdl-trim-bar").some(c => c.includes("sdl-web")),
      bowlHasBlossom: pieces(".sdl-trim-bowl").some(c => c.includes("sdl-blossom")) };
  });
  assertEqual(trim, { bar: "ravenloft", sky: "spring", barHasWeb: true, bowlHasBlossom: true },
    "Curse of Strahd on the bar, spring in the sky");
});

test("the season's trim is off until the GM turns it on, for everyone", async ctx => {
  const { gm, player } = ctx;
  await setTime(ctx, { year: 1525, day: 20, hour: 12 });
  const trim = session => session.eval(() => {
    const root = document.getElementById("sdl-calendar");
    return { kind: root.dataset.skyTrim || null, pieces: root.querySelectorAll(".sdl-trim-bar > *, .sdl-trim-bowl > *").length > 0 };
  });
  for ( const session of [gm, player] ) assertEqual(await trim(session), { kind: null, pieces: false }, "by default");
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonTrim", "follow"), MODULE_ID);
  for ( const session of [gm, player] ) {
    await waitFor(session, () => document.getElementById("sdl-calendar")?.dataset.skyTrim === "winter", undefined,
      "the trim to come");
    assertEqual(await trim(session), { kind: "winter", pieces: true }, "with the trim on");
  }
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonTrim", "summer"), MODULE_ID);
  for ( const session of [gm, player] ) {
    await waitFor(session, () => document.getElementById("sdl-calendar")?.dataset.skyTrim === "summer", undefined,
      "summer's trim in winter");
    assertEqual(await trim(session), { kind: "summer", pieces: true }, "with just summer");
  }
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonTrim", "none"), MODULE_ID);
  for ( const session of [gm, player] ) {
    await waitFor(session, () => !document.getElementById("sdl-calendar")?.dataset.skyTrim, undefined, "the trim to go");
    assertEqual(await trim(session), { kind: null, pieces: false }, "with the trim off again");
  }
});

test("the season band slides through the year", async ctx => {
  const positions = [];
  for ( const day of [0, 90, 180] ) {
    await setTime(ctx, { year: 1525, day, hour: 0 });
    positions.push(await ctx.gm.eval(() => document.querySelector("#sdl-calendar .sdl-season").style.backgroundPositionX));
  }
  const px = positions.map(p => parseFloat(p));
  assert(px[0] > px[1] && px[1] > px[2], `the band does not move left as the year passes: ${positions}`);
  assert(Math.abs((px[0] - px[1]) - (90 / 365 * 1380)) < 2, `the band moves the wrong distance: ${positions}`);
});

test("Selûne rides the bowl when she is up, with her phase", async ctx => {
  // Selûne is full a little before 16:30 on the 30th of Hammer 1501 DR, so she is high at the following midnight.
  await setTime(ctx, { year: 1501, day: 30, hour: 0 });
  let calendar = await readCalendar(ctx.player);
  assertEqual(calendar.moons, ["Selûne: Full Moon"], "moons at midnight");
  const place = await ctx.player.eval(() => {
    const moon = document.querySelector("#sdl-calendar .sdl-moon:not([hidden])").getBoundingClientRect();
    const bowl = document.querySelector("#sdl-calendar .sdl-sky").getBoundingClientRect();
    return { dx: (moon.x + (moon.width / 2)) - (bowl.x + (bowl.width / 2)), y: moon.y - bowl.y };
  });
  assert(Math.abs(place.dx) < 30 && place.y > 50, `a midnight full moon is not near the bottom of the bowl: ${JSON.stringify(place)}`);

  // At noon a full moon is below the horizon.
  await setTime(ctx, { year: 1501, day: 30, hour: 12 });
  calendar = await readCalendar(ctx.player);
  assertEqual(calendar.moons, [], "moons at noon");

  // The day she is full on, the 30th of Hammer (day 29, counted from 0), is marked beside the bowl.
  await setTime(ctx, { year: 1501, day: 29, hour: 12 });
  assertEqual((await readCalendar(ctx.player)).moonEvents, "Selûne is full", "the moon's event on the 30th of Hammer");
  await setTime(ctx, { year: 1501, day: 30, hour: 12 });
  assertEqual((await readCalendar(ctx.player)).moonEvents, null, "the moon's event the day after");
  await setTime(ctx, { year: 1501, day: 37, hour: 12 });
  assertEqual((await readCalendar(ctx.player)).moonEvents, null, "the moon's event a week later");
});

test("the sun crosses the bowl by day, rising and setting with the season", async ctx => {
  const { gm, player } = ctx;
  const read = session => session.eval(() => {
    const sun = document.querySelector("#sdl-calendar .sdl-sun");
    if ( !sun || sun.hidden ) return { shown: false, name: sun?.dataset.tooltip ?? null };
    const box = sun.getBoundingClientRect();
    const bowl = document.querySelector("#sdl-calendar .sdl-sky").getBoundingClientRect();
    return { shown: true, name: sun.dataset.tooltip, dx: Math.round((box.x + (box.width / 2)) - (bowl.x + (bowl.width / 2))),
      y: Math.round(box.y - bowl.y) };
  });

  // At noon the sun is at the bottom of the bowl.
  await setTime(ctx, { year: 1525, day: 170, hour: 12 });
  const noon = await read(player);
  assert(noon.shown && (Math.abs(noon.dx) < 3) && (noon.y > 60), `the noon sun is not at the bottom of the bowl: ${JSON.stringify(noon)}`);
  assertEqual(noon.name, "The Sun", "the sun's name");

  // Through the morning it climbs from the right; at night it is gone.
  await setTime(ctx, { year: 1525, day: 170, hour: 8 });
  const morning = await read(player);
  assert(morning.shown && (morning.dx > 60), `the morning sun is not on the right: ${JSON.stringify(morning)}`);
  await setTime(ctx, { year: 1525, day: 170, hour: 0 });
  assertEqual((await read(player)).shown, false, "the sun at midnight");

  // At six on midsummer's morning it is on the horizon, until the GM turns on long summer days, when it has been up
  // two hours.
  await setTime(ctx, { year: 1525, day: 170, hour: 6 });
  assertEqual((await read(player)).shown, false, "the sun at six before long summer days");
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonalDaylight", true), MODULE_ID);
  await waitFor(player, () => !document.querySelector("#sdl-calendar .sdl-sun").hidden, null,
    "the sun to be up at six on midsummer's morning");
});

test("summer days are long and winter days short, once the GM turns it on", async ctx => {
  const { gm, player } = ctx;
  const read = session => session.eval(() => {
    const calendar = game.time.calendar;
    const root = document.getElementById("sdl-calendar");
    return {
      sunrise: calendar.sunrise(game.time.components),
      phase: root.dataset.dayPhase,
      face: root.querySelector(".sdl-wheel-day").getAttribute("d")
    };
  });

  // Kythorn 20, the summer solstice, at five in the morning.
  await setTime(ctx, { year: 1525, day: 170, hour: 5 });
  const even = await read(player);
  assertEqual([even.sunrise, even.phase], [6, "dawn"], "sunrise and phase before it is turned on");

  await gm.eval(moduleId => game.settings.set(moduleId, "seasonalDaylight", true), MODULE_ID);
  for ( const session of [gm, player] ) {
    await waitFor(session, () => document.getElementById("sdl-calendar").dataset.dayPhase === "day", null,
      "five in the morning to be daytime at midsummer");
  }
  const summer = await read(player);
  assert(Math.abs(summer.sunrise - 4) < 0.05, `midsummer sunrise: ${summer.sunrise}`);
  assert(summer.face !== even.face, "the day face did not grow");
  assert(summer.face.includes(" 1 1 "), `the day face is not more than half the wheel: ${summer.face}`);

  // At midwinter, seven in the morning is still before dawn.
  await setTime(ctx, { year: 1525, day: 350, hour: 7, minute: 30 });
  const winter = await read(player);
  assert(Math.abs(winter.sunrise - 8) < 0.05, `midwinter sunrise: ${winter.sunrise}`);
  assertEqual(winter.phase, "dawn", "half past seven at midwinter");
});

test("the active scene darkens at night, once the GM turns it on", async ctx => {
  const { gm } = ctx;
  const darkness = () => gm.eval(() => game.scenes.active.environment.darknessLevel);
  const settle = async what => {
    await gm.page.waitForTimeout(300);
    return waitFor(gm, moduleId => {
      const level = game.scenes.active.environment.darknessLevel;
      return Math.abs(level - game.modules.get(moduleId).api.darknessNow()) < 0.01 ? String(level) : null;
    }, MODULE_ID, what).then(Number);
  };
  await gm.eval(() => game.scenes.active.update({ "environment.darknessLevel": 0, "environment.darknessLock": false }));

  // A moonless midnight: Selûne is new on the 15th of Hammer 1501 DR.
  await setTime(ctx, { year: 1501, day: 14, hour: 0 });
  assertEqual(await darkness(), 0, "darkness before it is turned on");
  await gm.eval(moduleId => game.settings.set(moduleId, "sceneDarkness", true), MODULE_ID);
  assertEqual(await settle("a moonless midnight"), 1, "a moonless midnight");

  await setTime(ctx, { year: 1501, day: 14, hour: 12 });
  assertEqual(await settle("noon"), 0, "noon");

  // Through dusk the light fades by degrees.
  const dusk = [];
  for ( const [hour, minute] of [[17, 0], [18, 0], [18, 30], [19, 30]] ) {
    await setTime(ctx, { year: 1501, day: 14, hour, minute });
    dusk.push(await settle(`${hour}:${minute}`));
  }
  assert((dusk[0] > 0) && (dusk[0] < 0.1), `late afternoon: ${dusk}`);
  assertEqual(dusk[1], 0.3, "sunset");
  assert((dusk[2] > 0.5) && (dusk[2] < 0.85), `half an hour after sunset: ${dusk}`);
  assertEqual(dusk[3], 1, "an hour and a half after sunset");

  // Under a full moon the night is a little lighter: Selûne is full on the 30th of Hammer.
  await setTime(ctx, { year: 1501, day: 30, hour: 0 });
  const full = await settle("a moonlit midnight");
  assert((full > 0.75) && (full < 0.9), `a moonlit midnight: ${full}`);

  // A scene with its darkness locked is left as it is.
  await gm.eval(() => game.scenes.active.update({ "environment.darknessLock": true }));
  await setTime(ctx, { year: 1501, day: 30, hour: 12 });
  await gm.page.waitForTimeout(300);
  assertEqual(await darkness(), full, "a locked scene's darkness");
  await gm.eval(() => game.scenes.active.update({ "environment.darknessLock": false }));
  assertEqual(await settle("noon, once unlocked"), 0, "noon, once unlocked");

  // A scene taken off the sky is left as it is, and comes back into step when it's put back on.
  const flag = `flags.${MODULE_ID}.followSky`;
  await gm.eval(flag => game.scenes.active.update({ [flag]: false }), flag);
  await setTime(ctx, { year: 1501, day: 30, hour: 0 });
  await gm.page.waitForTimeout(300);
  assertEqual(await darkness(), 0, "a scene that doesn't follow the sky");
  await gm.eval(flag => game.scenes.active.update({ [flag]: true }), flag);
  assertEqual(await settle("a moonlit midnight, followed again"), full, "a scene that follows the sky again");

  // The setting is in the Darkness section of the scene's configuration, under the lock, and saves with the sheet.
  const sheet = await gm.eval(async flag => {
    const app = game.scenes.active.sheet;
    await app.render({ force: true });
    const input = app.element.querySelector(`[name="${flag}"]`);
    const after = input?.closest(".form-group").previousElementSibling?.querySelector("[name]")?.name;
    input.checked = false;
    await app.submit();
    await app.close();
    return { checked: input.defaultChecked, after, saved: foundry.utils.getProperty(game.scenes.active, flag) };
  }, flag);
  assertEqual(sheet.checked, true, "Follow the Sky ticked on the sheet");
  assertEqual(sheet.after, "environment.darknessLock", "Follow the Sky under Darkness Level Lock");
  assertEqual(sheet.saved, false, "Follow the Sky saved from the sheet");
  await gm.eval(flag => game.scenes.active.update({ [flag]: true }), flag);
});

test("each player picks the calendar's style for themselves", async ({ gm, player }) => {
  const look = session => session.eval(() => {
    const root = document.getElementById("sdl-calendar");
    const panel = getComputedStyle(root.querySelector(".sdl-bar")).backgroundColor;
    const bowl = getComputedStyle(root.querySelector(".sdl-stop-bowl-inner")).stopColor;
    return { theme: root.dataset.theme, panel, bowl };
  });
  const gilded = await look(player);
  assertEqual(gilded.theme, "gilded", "the default style");

  for ( const theme of ["parchment", "stone"] ) {
    await setClientSettings(player, { theme });
    const styled = await look(player);
    assertEqual(styled.theme, theme, "the style picked");
    assert(styled.panel !== gilded.panel, `${theme} has the default panel: ${styled.panel}`);
    assert(styled.bowl !== gilded.bowl, `${theme} has the default sky: ${styled.bowl}`);
    assertEqual((await look(gm)).theme, "gilded", `the GM's style while the player has ${theme}`);
  }

  await player.reload();
  assertEqual((await look(player)).theme, "stone", "the style after a reload");
});

/* -------------------------------------------- */
/*  Controls                                    */
/* -------------------------------------------- */

test("the GM has the time controls and players don't", async ({ gm, player }) => {
  const gmControls = (await readCalendar(gm)).controls;
  for ( const action of ["reverse", "setDate", "advance", "toggleCalendar"] ) {
    assert(gmControls.includes(action), `the GM has no ${action} button: ${gmControls}`);
  }
  const playerControls = (await readCalendar(player)).controls;
  for ( const action of ["reverse", "setDate", "advance"] ) {
    assert(!playerControls.includes(action), `the player has a ${action} button: ${playerControls}`);
  }
  assert(playerControls.includes("openCharacterSheet"), `the player has no character sheet button: ${playerControls}`);
  assert(playerControls.includes("toggleCalendar"), `the player has no toggle: ${playerControls}`);
});

test("rewind and advance sit at the outer ends of the bar", async ({ gm }) => {
  const order = await gm.eval(() => {
    const centre = el => { const b = el.getBoundingClientRect(); return b.x + (b.width / 2); };
    const buttons = [...document.querySelectorAll("#sdl-calendar .sdl-controls > .calendar-button > button")];
    return buttons.sort((a, b) => centre(a) - centre(b)).map(b => b.dataset.action);
  });
  assertEqual(order[0], "reverse", "leftmost button");
  assertEqual(order.at(-1), "advance", "rightmost button");
});

test("the advance and rewind buttons and their drop-downs change the time", async ctx => {
  const start = await setTime(ctx, { year: 1525, day: 100, hour: 8 });
  const { gm } = ctx;
  await gm.page.locator("#sdl-calendar [data-control=advance] > button").click();
  await waitFor(gm, t => game.time.worldTime === t, start + 3600, "an hour to pass");

  await gm.page.locator("#sdl-calendar [data-control=advance] > button").hover();
  const plusDay = gm.page.locator("#sdl-calendar [data-control=advance] .sdl-dropdown button[data-unit=day][data-value='1']");
  await plusDay.waitFor({ state: "visible", timeout: 5000 });
  await plusDay.click();
  await waitFor(gm, t => game.time.worldTime === t, start + 3600 + 86400, "a day to pass");

  await gm.page.locator("#sdl-calendar [data-control=reverse] > button").hover();
  const minus8 = gm.page.locator("#sdl-calendar [data-control=reverse] .sdl-dropdown button[data-unit=hour][data-value='8']");
  await minus8.waitFor({ state: "visible", timeout: 5000 });
  await minus8.click();
  const end = start + 3600 + 86400 - (8 * 3600);
  await waitFor(gm, t => game.time.worldTime === t, end, "eight hours to rewind");
  await waitForShown(ctx.player, end);
});

test("the Set Date button opens D&D 5e's Set Date dialog", async ({ gm }) => {
  await gm.page.locator("#sdl-calendar button[data-action=setDate]").click();
  await waitFor(gm, () => [...foundry.applications.instances.values()]
    .some(a => a.rendered && (a.constructor.name === "SetDateDialog")), null, "the Set Date dialog");
});

test("the season band's tooltip gives the season and when each moon is next full", async ctx => {
  // Selûne is full on the 30th of Hammer 1501 DR, day 29 counted from 0.
  await setTime(ctx, { year: 1501, day: 24, hour: 12 });
  let tooltip = (await readCalendar(ctx.player)).seasonTooltip;
  assert(tooltip.startsWith("<strong>Winter</strong>"), `the tooltip does not start with the season: ${tooltip}`);
  assert(tooltip.includes("Selûne: Waxing Gibbous, full in 5 days"), `the tooltip's forecast: ${tooltip}`);
  await setTime(ctx, { year: 1501, day: 28, hour: 12 });
  tooltip = (await readCalendar(ctx.player)).seasonTooltip;
  assert(tooltip.includes("full tomorrow"), `the tooltip the day before: ${tooltip}`);
  await setTime(ctx, { year: 1501, day: 29, hour: 6 });
  tooltip = (await readCalendar(ctx.player)).seasonTooltip;
  assert(tooltip.includes("Full Moon, full today"), `the tooltip on the day: ${tooltip}`);
});

test("buttons other modules add with D&D 5e's hook appear and work", async ({ gm, player }) => {
  // Shaped like Tomb of Annihilation's Travel Tracker button: GM-only, on the left, with a click handler.
  const add = async () => {
    globalThis.__sdlHook = Hooks.on("dnd5e.prepareCalendarButtons", (app, buttons) => buttons.push({
      action: "sdlTest", icon: "fa-solid fa-route", position: "start", tooltip: "Test", visible: game.user.isGM,
      onClick: () => { globalThis.__sdlClicked = true; }
    }));
    await dnd5e.ui.calendar.render();
  };
  const remove = async () => {
    Hooks.off("dnd5e.prepareCalendarButtons", globalThis.__sdlHook);
    await dnd5e.ui.calendar.render();
  };
  try {
    await gm.eval(add);
    await player.eval(add);
    const shown = await gm.eval(() => {
      const bar = document.querySelector("#sdl-calendar .sdl-start").getBoundingClientRect();
      const button = document.querySelector("#sdl-calendar .sdl-start button[data-action=sdlTest]");
      const r = button?.getBoundingClientRect();
      return { start: !!button, fits: !!r && (r.width > 0) && (r.left >= bar.left) && (r.right <= bar.right) };
    });
    assertEqual(shown, { start: true, fits: true }, "the GM's added button on the left of the bar");
    assertEqual(await player.eval(() => !!document.querySelector("#sdl-calendar button[data-action=sdlTest]")),
      false, "the GM-only button for a player");
    await gm.page.locator("#sdl-calendar button[data-action=sdlTest]").click();
    await waitFor(gm, () => globalThis.__sdlClicked === true, null, "the added button's click handler");
  } finally {
    await gm.eval(remove);
    await player.eval(remove);
  }
});

test("the toggle hides and shows the sky, and is remembered", async ({ player }) => {
  const toggle = player.page.locator("#sdl-calendar button[data-action=toggleCalendar]");
  await toggle.click();
  await player.page.waitForTimeout(400);
  let calendar = await readCalendar(player);
  assertEqual([calendar.expanded, calendar.visualHeight], [false, 0], "collapsed");
  assertEqual(await player.eval(id => game.settings.get(id, "expanded"), MODULE_ID), false, "the remembered state");

  await player.reload();
  calendar = await readCalendar(player);
  assertEqual(calendar.expanded, false, "collapsed after a reload");

  await player.page.locator("#sdl-calendar button[data-action=toggleCalendar]").click();
  await player.page.waitForTimeout(400);
  calendar = await readCalendar(player);
  assert(calendar.expanded && (calendar.visualHeight > 100), `not expanded again: ${JSON.stringify(calendar)}`);
});

test("a change of time plays out on the calendar", async ctx => {
  const start = await setTime(ctx, { year: 1525, day: 100, hour: 8 });
  await setClientSettings(ctx.player, { animate: true });
  await ctx.gm.eval(() => game.time.advance(86400));
  const midway = await waitFor(ctx.player, ({ start }) => {
    const shown = dnd5e.ui.calendar.shownTime;
    return (dnd5e.ui.calendar.animating && (shown > start + 3600) && (shown < start + 82800)) ? shown : null;
  }, { start }, "the calendar to be part way through the change");
  assert(midway > start, `shown time ${midway}`);
  await waitForShown(ctx.player, start + 86400);
});

test("the calendar follows the user's choice to hide it", async ({ player }) => {
  await player.eval(() => game.settings.set("dnd5e", "calendarPreferences", {
    visible: false, formatters: { date: "monthDay", time: "hoursMinutes" }
  }));
  await waitFor(player, () => !document.getElementById("sdl-calendar"), null, "the calendar to close");
});

test("/date whispers the date and the sky, and /advance and /rewind move the time for the GM", async ctx => {
  const { gm, player } = ctx;
  const say = (session, message) => session.eval(message => ui.chat.processMessage(message), message);

  // Selûne is full on the 30th of Hammer 1501 DR.
  const start = await setTime(ctx, { year: 1501, day: 30, hour: 0 });
  const messages = await player.eval(() => game.messages.size);
  await say(player, "/date");
  const card = await waitFor(player, n => {
    const message = game.messages.contents.at(-1);
    return (game.messages.size > n) && message.content.includes("sdl-chat")
      ? { content: message.content, whisper: message.whisper } : null;
  }, messages, "the date to be whispered");
  const playerId = await player.eval(() => game.user.id);
  assertEqual(card.whisper, [playerId], "who /date is whispered to");
  for ( const text of ["1501", "Winter", "Selûne: Full Moon"] ) {
    assert(card.content.includes(text), `/date does not say ${text}: ${card.content}`);
  }

  await say(gm, "/advance 1 day 6 hours");
  await waitFor(gm, t => game.time.worldTime === t, start + (30 * 3600), "/advance 1 day 6 hours");
  await say(gm, "/rewind 90 minutes");
  await waitFor(gm, t => game.time.worldTime === t, start + (28.5 * 3600), "/rewind 90 minutes");
  await say(gm, "/advance dawn");
  await waitFor(gm, t => game.time.worldTime === t, start + (30 * 3600), "/advance dawn");
  await say(gm, "/advance");
  await waitFor(gm, t => game.time.worldTime === t, start + (31 * 3600), "/advance on its own");

  // Players can't move the time.
  await say(player, "/advance 8 hours");
  await player.page.waitForTimeout(500);
  assertEqual(await gm.eval(() => game.time.worldTime), start + (31 * 3600), "the time after a player's /advance");
});

test("each dawn is announced in the chat, once the GM turns it on", async ctx => {
  const { gm, player } = ctx;
  const cards = () => player.eval(() => game.messages.contents.filter(m => m.content.includes("sdl-daybreak"))
    .map(m => m.content));
  const before = (await cards()).length;

  // Nothing is posted over a dawn while it is turned off.
  await setTime(ctx, { year: 1525, day: 120, hour: 22 });
  await gm.eval(() => game.time.advance(10 * 3600));
  await gm.page.waitForTimeout(500);
  assertEqual((await cards()).length, before, "cards before it is turned on");

  await gm.eval(moduleId => game.settings.set(moduleId, "announceDays", true), MODULE_ID);
  await gm.eval(() => game.time.advance(2 * 3600));
  await gm.page.waitForTimeout(500);
  assertEqual((await cards()).length, before, "cards after time passes without a sunrise");

  // A jump over three dawns posts only the last.
  await gm.eval(() => game.time.advance(3 * 86400));
  await waitFor(player, n => game.messages.contents.filter(m => m.content.includes("sdl-daybreak")).length === n,
    before + 1, "the dawn to be announced");
  const card = (await cards()).at(-1);
  const expected = await gm.eval(() => game.time.calendar.format(game.time.components, "formatMonthDayYear"));
  assert(card.includes(expected), `the card does not say ${expected}: ${card}`);

  // Rewinding over a dawn doesn't announce it.
  await gm.eval(() => game.time.advance(-86400));
  await gm.page.waitForTimeout(500);
  assertEqual((await cards()).length, before + 1, "cards after rewinding");
});

test("the dawn that starts a season or a festival says so", async ctx => {
  const { gm, player } = ctx;
  await gm.eval(moduleId => game.settings.set(moduleId, "announceDays", true), MODULE_ID);
  const count = () => player.eval(() => game.messages.contents.filter(m => m.content.includes("sdl-daybreak")).length);
  const announce = async day => {
    await setTime(ctx, { year: 1525, day: day - 1, hour: 12 });
    const before = await count();
    await gm.eval(() => game.time.advance(86400));
    return waitFor(player, n => {
      const cards = game.messages.contents.filter(m => m.content.includes("sdl-daybreak"));
      return (cards.length > n) ? cards.at(-1).content : null;
    }, before, "the dawn to be announced");
  };
  // Midwinter, the day after the 30th of Hammer, and the 19th of Ches, the first day of spring.
  assert((await announce(30)).includes("Midwinter"), "Midwinter is not announced");
  assert((await announce(78)).includes("The first day of Spring"), "the first day of spring is not announced");
});

/* -------------------------------------------- */
/*  Other Calendars                             */
/* -------------------------------------------- */

test("the Calendar of Greyhawk has Luna and Celene, and Liga for its sun", async ctx => {
  const { gm, player } = ctx;
  try {
    await useCalendar(gm, "greyhawk");
    await player.reload();
    // Both moons are full on the fourth day of Needfest 576 CY, and high at its midnight.
    await setTime(ctx, { year: 576, day: 3, hour: 0 });
    const calendar = await readCalendar(player);
    assertEqual([...calendar.moons].sort(), ["Celene: Full Moon", "Luna: Full Moon"], "moons");
    assertEqual(calendar.moonEvents, "Luna and Celene are full together", "the moons' event");
    assertEqual(calendar.festival, "Needfest", "festival");
    await setTime(ctx, { year: 576, day: 3, hour: 12 });
    const sun = await player.eval(() => document.querySelector("#sdl-calendar .sdl-sun:not([hidden])")?.dataset.tooltip);
    assertEqual(sun, "Liga", "the sun's name on Oerth");
  } finally {
    if ( await useCalendar(gm, "harptos") ) await player.reload();
  }
});
