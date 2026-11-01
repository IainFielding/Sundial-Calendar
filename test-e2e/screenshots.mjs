/**
 * Take the screenshots in docs/screenshots from a real Foundry.
 *
 *   npm run docs:screenshots
 *
 * Uses the end-to-end harness's world and fixtures, with the canvas on so the calendar hangs over a scene. A scene
 * named "screenshot" in the test world, added by hand, is the backdrop: it is activated and viewed for the shots.
 * Without one, the fixtures' blank scene is used.
 *
 * Each sky and bar trim is shot too, into docs/screenshots/trims. To take only those, or only some bar trims by name:
 *
 *   npm run docs:screenshots -- --trims
 *   npm run docs:screenshots -- --trims yawningportal candlekeep
 *
 * And the moons' events and forecasts, into docs/screenshots/lunar-*.png. To take only those:
 *
 *   npm run docs:screenshots -- --lunar
 *
 * And the README's opening picture, docs/screenshots/hero.png. To take only that:
 *
 *   npm run docs:screenshots -- --hero
 *
 * And the sun's course across the bowl, into docs/screenshots/sun-*.png. To take only those:
 *
 *   npm run docs:screenshots -- --sun
 */

import fs from "node:fs";
import { GM_USER, MODULE_ID, PLAYER_USER, WORLD } from "./config.mjs";
import { setTime } from "./lib/harness.mjs";
import { startFoundry } from "./lib/server.mjs";
import { Session } from "./lib/session.mjs";
import { enableModules, ensureWorld, resetFixtures, resetWorld, useCalendar } from "./lib/world.mjs";

// The calendar hangs over the scene, so the canvas is drawn (see lib/session.mjs).
process.env.SDL_CANVAS = "1";

const OUT = "docs/screenshots";
fs.mkdirSync(OUT, { recursive: true });

/** Take only the trims' shots. */
const TRIMS_ONLY = process.argv.includes("--trims");

/** The bar trims to take, if only some are named, as for `--trims yawningportal`. */
const TRIM_NAMES = process.argv.slice(2).filter(a => !a.startsWith("--"));

/** Take only the moons' shots. */
const LUNAR_ONLY = process.argv.includes("--lunar");

/** Take only the README's opening picture. */
const HERO_ONLY = process.argv.includes("--hero");

/** Take only the sun's shots. */
const SUN_ONLY = process.argv.includes("--sun");

/** The calendar and a margin around it, for a cropped shot. */
const CLIP = { x: 480, y: 0, width: 640, height: 230 };

ensureWorld();
const server = await startFoundry(WORLD.id);
let gm;
let player;
try {
  gm = await Session.open(GM_USER, { scale: 2 });
  await enableModules(gm);
  await useCalendar(gm, "harptos");
  await resetFixtures(gm);
  player = await Session.open(PLAYER_USER, { scale: 2 });
  const ctx = { gm, player };
  await resetWorld(gm, player);

  // The backdrop: the hand-made "screenshot" scene, shown to everyone, with the game unpaused so no banner covers it.
  const backdrop = await gm.eval(async () => {
    const scene = game.scenes.find(s => s.name.trim().toLowerCase() === "screenshot");
    if ( scene && !scene.active ) await scene.activate();
    if ( game.paused ) game.togglePause(false, { broadcast: true });
    return scene?.name ?? null;
  });
  console.log(backdrop ? `Backdrop: the "${backdrop}" scene.` : "No \"screenshot\" scene, so the backdrop is blank.");
  for ( const session of [gm, player] ) {
    await waitForCanvas(session, backdrop);
    await session.eval(() => ui.sidebar.collapse?.());
  }

  const shoot = async (session, name, clip = CLIP) => {
    await waitForCanvas(session, backdrop);
    await hideNotifications(session);
    await session.page.mouse.move(5, 900);
    await session.page.waitForTimeout(300);
    await session.page.screenshot({ path: `${OUT}/${name}.png`, clip });
    console.log(`  ${OUT}/${name}.png`);
  };

  const all = !TRIMS_ONLY && !LUNAR_ONLY && !HERO_ONLY && !SUN_ONLY;
  if ( all || HERO_ONLY ) await heroShot(ctx, shoot);
  if ( all ) await docShots(ctx, shoot);
  if ( all || SUN_ONLY ) await sunShots(ctx, shoot);
  if ( all || LUNAR_ONLY ) await lunarShots(ctx, backdrop);
  if ( all || TRIMS_ONLY ) await trimShots(ctx, shoot, backdrop);

  // The whole screen, for context.
  if ( all ) {
    await gm.page.mouse.move(5, 900);
    await gm.page.screenshot({ path: `${OUT}/screen.png` });
    console.log(`  ${OUT}/screen.png`);
  }
} finally {
  await player?.close();
  await gm?.close({ shutDownWorld: true });
  await server.stop();
}

/* -------------------------------------------- */

/**
 * Hide Foundry's notifications, which would sit over a shot: the test browser draws without a graphics card, so each
 * load warns that hardware acceleration is off. A reload brings them back, so this is called before every shot.
 * @param {Session} session
 */
async function hideNotifications(session) {
  await session.page.evaluate(() => {
    if ( document.getElementById("sdl-hide-notifications") ) return;
    const style = document.createElement("style");
    style.id = "sdl-hide-notifications";
    style.textContent = "#notifications { display: none !important; }";
    document.head.append(style);
  });
}

/* -------------------------------------------- */

/**
 * The sun crossing the bowl: climbing through a spring morning, at the bottom of the bowl at noon, behind a new
 * Selûne, and up early on midsummer's morning with Long Summer Days on.
 * @param {{gm: Session, player: Session}} ctx
 * @param {(session: Session, name: string, clip?: object) => Promise<void>} shoot
 */
async function sunShots(ctx, shoot) {
  const { gm } = ctx;
  await setTime(ctx, { year: 1525, day: 120, hour: 8, minute: 30 });
  await shoot(gm, "sun-morning");
  await setTime(ctx, { year: 1525, day: 120, hour: 12, minute: 0 });
  await shoot(gm, "sun-noon");
  // Selûne is new at a quarter past eleven on the 15th of Hammer, 1501 DR, and passes over the sun.
  await setTime(ctx, { year: 1501, day: 14, hour: 11, minute: 15 });
  await shoot(gm, "sun-eclipse");
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonalDaylight", true), MODULE_ID);
  await setTime(ctx, { year: 1525, day: 170, hour: 6, minute: 0 });
  await shoot(gm, "sun-midsummer-dawn");
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonalDaylight", false), MODULE_ID);
}

/* -------------------------------------------- */

/**
 * The README's opening picture, and Foundry's setup-screen artwork: the calendar as it comes, with no trims, at sunset
 * on a spring evening, the day wheel turned half to day and half to night, and Selûne waxing in the bowl. The evening
 * is the first in spring with no festival or full or new moon to mark, and Selûne up and clear of the middle of the
 * bowl.
 * @param {{gm: Session, player: Session}} ctx
 * @param {(session: Session, name: string, clip?: object) => Promise<void>} shoot
 */
async function heroShot(ctx, shoot) {
  const { gm } = ctx;
  await gm.eval(async moduleId => {
    for ( const key of ["seasonTrim", "barTrim"] ) await game.settings.set(moduleId, key, "none");
  }, MODULE_ID);
  const evening = await gm.eval(async moduleId => {
    const sky = await import(`/modules/${moduleId}/scripts/sky.mjs`);
    const { festivalKey, moonEventLabels, worldMoons } = await import(`/modules/${moduleId}/scripts/calendar.mjs`);
    const calendar = game.time.calendar;
    const [selune] = worldMoons();
    for ( let day = 90; day < 170; day++ ) {
      const time = calendar.componentsToTime({ year: 1525 - calendar.years.yearZero, day, hour: 18 });
      const components = calendar.timeToComponents(time);
      const phase = sky.moonPhase(calendar, selune, time);
      const angle = sky.moonSkyAngle(sky.dayFraction(calendar, time), phase);
      const fromMiddle = Math.abs(sky.wrap(angle - (Math.PI / 2) + Math.PI, 2 * Math.PI) - Math.PI);
      if ( festivalKey(calendar, components) || moonEventLabels(time).length ) continue;
      if ( (phase > 0.3) && (phase < 0.42) && sky.aboveHorizon(angle) && (fromMiddle > 0.35) ) return day;
    }
    return 120;
  }, MODULE_ID);
  console.log(`  The hero's evening: day ${evening} of 1525.`);
  await setTime(ctx, { year: 1525, day: evening, hour: 18, minute: 0 });
  await shoot(gm, "hero");

  // The same evening, taller, for the module's artwork on Foundry's setup screen (see "media" in module.json).
  fs.mkdirSync("assets", { recursive: true });
  await gm.page.screenshot({ path: "assets/cover.jpg", type: "jpeg", quality: 88, clip: { ...CLIP, height: 416 } });
  console.log("  assets/cover.jpg");
}

/* -------------------------------------------- */

/**
 * The shots in the README: the calendar through the day, the GM's controls, collapsed, each style, and a short
 * winter day.
 * @param {{gm: Session, player: Session}} ctx
 * @param {(session: Session, name: string, clip?: object) => Promise<void>} shoot
 */
async function docShots(ctx, shoot) {
  const { gm } = ctx;

  // The season's trim is off by default; it is on in these first shots, to show it.
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonTrim", "follow"), MODULE_ID);

  // A full Selûne riding high on a winter's night, then noon in spring and dusk at the end of summer.
  await setTime(ctx, { year: 1501, day: 30, hour: 0, minute: 10 });
  await shoot(gm, "night");

  await setTime(ctx, { year: 1525, day: 120, hour: 12, minute: 0 });
  await shoot(gm, "day");
  await setTime(ctx, { year: 1525, day: 250, hour: 18, minute: 30 });
  await shoot(gm, "dusk");

  // The GM's advance drop-down.
  await setTime(ctx, { year: 1525, day: 120, hour: 9, minute: 15 });
  await gm.page.locator("#sdl-calendar [data-control=advance] > button").hover();
  await gm.page.waitForTimeout(300);
  // The button's tooltip sits off its right side, past the usual crop: widen the shot to take it in.
  const tip = await gm.page.locator("#tooltip").boundingBox();
  const right = Math.max(CLIP.x + CLIP.width, Math.ceil((tip?.x ?? 0) + (tip?.width ?? 0)) + 16);
  await gm.page.screenshot({ path: `${OUT}/advance.png`, clip: { ...CLIP, width: right - CLIP.x, height: 260 } });
  console.log(`  ${OUT}/advance.png`);

  // Collapsed to the bar alone.
  await gm.page.locator("#sdl-calendar button[data-action=toggleCalendar]").click();
  await gm.page.waitForTimeout(400);
  await shoot(gm, "collapsed", { ...CLIP, height: 70 });
  await gm.page.locator("#sdl-calendar button[data-action=toggleCalendar]").click();

  // The season's trim is off by default, and off for the rest of the shots, which show the calendar as it is set up.
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonTrim", "none"), MODULE_ID);

  // Each style, at the same midnight as the first shot, to set side by side.
  await setTime(ctx, { year: 1501, day: 30, hour: 0, minute: 10 });
  for ( const theme of ["gilded", "parchment", "stone"] ) {
    await gm.eval(({ moduleId, theme }) => game.settings.set(moduleId, "theme", theme), { moduleId: MODULE_ID, theme });
    await shoot(gm, `style-${theme}`);
  }
  await gm.eval(moduleId => game.settings.set(moduleId, "theme", "gilded"), MODULE_ID);

  // A short winter day, a few days after the solstice, with Long Summer Days on.
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonalDaylight", true), MODULE_ID);
  await setTime(ctx, { year: 1525, day: 358, hour: 12, minute: 0 });
  await shoot(gm, "winter-day");
  await gm.eval(moduleId => game.settings.set(moduleId, "seasonalDaylight", false), MODULE_ID);
}

/* -------------------------------------------- */

/**
 * The moons' shots: the marker for a full moon and its tooltip, the band's forecast of each moon's phase and next
 * full moon, Greyhawk's two moons full together, and Eberron's twelve moons. All but Eberron's are taken hovering over
 * what shows the tooltip, with the shot widened to take the tooltip in.
 * @param {{gm: Session, player: Session}} ctx
 * @param {string|null} backdrop
 */
async function lunarShots(ctx, backdrop) {
  const { gm, player } = ctx;

  const shootTooltip = async (name, selector) => {
    await waitForCanvas(gm, backdrop);
    const target = gm.page.locator(`#sdl-calendar ${selector}`);
    await target.waitFor({ state: "visible", timeout: 10_000 });
    await hideNotifications(gm);
    await gm.page.mouse.move(5, 900);
    await target.hover();
    await gm.page.waitForFunction(() => document.getElementById("tooltip")?.classList.contains("active"));
    await gm.page.waitForTimeout(400);
    const tip = await gm.page.locator("#tooltip").boundingBox();
    const left = Math.min(CLIP.x, Math.floor(tip.x) - 16);
    const right = Math.max(CLIP.x + CLIP.width, Math.ceil(tip.x + tip.width) + 16);
    const bottom = Math.max(CLIP.y + CLIP.height, Math.ceil(tip.y + tip.height) + 16);
    await gm.page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: left, y: CLIP.y, width: right - left, height: bottom } });
    console.log(`  ${OUT}/${name}.png`);
    await gm.page.mouse.move(5, 900);
  };

  const switchCalendar = async calendar => {
    if ( !await useCalendar(gm, calendar) ) return;
    await player.reload();
    for ( const session of [gm, player] ) {
      await waitForCanvas(session, backdrop);
      await session.eval(() => ui.sidebar.collapse?.());
    }
  };

  // The first night from a date whose moons' events match a pattern, found with the module's own reckoning.
  const eventNight = async ({ year, day, hour }, pattern) => {
    const found = await gm.eval(async ({ moduleId, year, day, hour, pattern }) => {
      const { moonEventLabels } = await import(`/modules/${moduleId}/scripts/calendar.mjs`);
      const calendar = game.time.calendar;
      const y = year - calendar.years.yearZero;
      for ( let d = day; d < day + 800; d++ ) {
        const time = calendar.componentsToTime({ year: y, day: d, hour, minute: 0 });
        if ( new RegExp(pattern).test(moonEventLabels(time).join(" ")) ) {
          const c = calendar.timeToComponents(time);
          return { year: c.year + calendar.years.yearZero, day: c.day };
        }
      }
      return null;
    }, { moduleId: MODULE_ID, year, day, hour, pattern: pattern.source });
    if ( !found ) throw new Error(`No night matching ${pattern} within two years of day ${day} of ${year}.`);
    await setTime(ctx, { ...found, hour, minute: 0 });
  };

  // Selûne full, and the band's forecast the same night.
  await switchCalendar("harptos");
  await eventNight({ year: 1501, day: 25, hour: 23 }, /is full/);
  await shootTooltip("lunar-full", ".sdl-moon-event-icon");
  await shootTooltip("lunar-forecast", ".sdl-season");

  // Luna and Celene full together on the fourth day of Needfest, late at night.
  await switchCalendar("greyhawk");
  await eventNight({ year: 591, day: 0, hour: 23 }, /full together/);
  await shootTooltip("lunar-greyhawk", ".sdl-moon-event-icon");

  // Eberron's twelve moons in the night sky, with nothing hovered: the hour, within two years, that has the most of
  // them in the bowl, and of those the one with the moons spread furthest apart.
  await switchCalendar("khorvaire");
  const crowded = await gm.eval(async moduleId => {
    const sky = await import(`/modules/${moduleId}/scripts/sky.mjs`);
    const { worldMoons } = await import(`/modules/${moduleId}/scripts/calendar.mjs`);
    const { SKY } = await import(`/modules/${moduleId}/scripts/hud.mjs`);
    const calendar = game.time.calendar;
    const moons = worldMoons().map(config => ({ config, epoch: sky.epochTime(calendar, config) }));
    const start = calendar.componentsToTime({ year: 998 - calendar.years.yearZero, day: 0, hour: 0, minute: 0 });
    const hour = calendar.days.secondsPerMinute * calendar.days.minutesPerHour;
    let best = null;
    for ( let i = 0; i < 2 * calendar.days.daysPerYear * calendar.days.hoursPerDay; i++ ) {
      const time = start + (i * hour);
      const fraction = sky.dayFraction(calendar, time);
      if ( (fraction > 0.1) && (fraction < 0.9) ) continue; // Only the hours either side of midnight.
      const angles = moons.map(({ config, epoch }) => sky.moonSkyAngle(fraction, sky.moonPhase(calendar, config, time, epoch)))
        .filter(angle => sky.aboveHorizon(angle) && (sky.orbitPoint(angle, { x: SKY.cx, y: SKY.cy, r: SKY.orbit }).y > -13))
        .sort((a, b) => a - b);
      const gap = Math.min(Infinity, ...angles.slice(1).map((angle, j) => angle - angles[j]));
      if ( !best || (angles.length > best.count) || ((angles.length === best.count) && (gap > best.gap)) ) {
        best = { time, count: angles.length, gap };
      }
    }
    const c = calendar.timeToComponents(best.time);
    return { year: c.year + calendar.years.yearZero, day: c.day, hour: c.hour, count: best.count };
  }, MODULE_ID);
  console.log(`  ${crowded.count} of Eberron's moons in the sky on day ${crowded.day} of ${crowded.year} at ${crowded.hour}:00.`);
  await setTime(ctx, { year: crowded.year, day: crowded.day, hour: crowded.hour, minute: 0 });
  await waitForCanvas(gm, backdrop);
  await hideNotifications(gm);
  await gm.page.mouse.move(5, 900);
  await gm.page.waitForTimeout(400);
  await gm.page.screenshot({ path: `${OUT}/lunar-khorvaire.png`, clip: CLIP });
  console.log(`  ${OUT}/lunar-khorvaire.png`);

  await switchCalendar("harptos");
}

/* -------------------------------------------- */

/**
 * A shot of each trim: the sky's for each season and each festival of the Calendar of Harptos, and the bar's for
 * each adventure, with the bar collapsed too so its whole length shows.
 * @param {{gm: Session, player: Session}} ctx
 * @param {(session: Session, name: string, clip?: object) => Promise<void>} shoot
 */
async function trimShots(ctx, shoot, backdrop) {
  const { gm } = ctx;
  const set = (key, value) => gm.eval(({ moduleId, key, value }) => game.settings.set(moduleId, key, value),
    { moduleId: MODULE_ID, key, value });
  fs.mkdirSync(`${OUT}/trims`, { recursive: true });

  // The seasons, mid-season, and each festival on its day, at dusk; unless only some bar trims are named.
  await set("barTrim", "none");
  await set("seasonTrim", "follow");
  const seasons = TRIM_NAMES.length ? {} : { winter: [1525, 15], spring: [1525, 100], summer: [1525, 180],
    fall: [1525, 300] };
  for ( const [kind, [year, day]] of Object.entries(seasons) ) {
    await setTime(ctx, { year, day, hour: 19, minute: 0 });
    await expectSkyTrim(gm, kind);
    await shoot(gm, `trims/sky-${kind}`);
  }
  const festivals = TRIM_NAMES.length ? {} : { midwinter: "Midwinter", greengrass: "Greengrass",
    midsummer: "Midsummer", shieldmeet: "Shieldmeet", harvest: "Highharvestide", moonfeast: "FeastOfTheMoon" };
  for ( const [kind, festival] of Object.entries(festivals) ) {
    const { year, day } = await festivalDay(gm, 1524, festival);
    await setTime(ctx, { year, day, hour: 19, minute: 0 });
    await expectSkyTrim(gm, kind);
    await shoot(gm, `trims/festival-${kind}`);
  }

  // The Exandrian calendar's own holidays, on the module's calendar, put up for the world while they're shot.
  const holidays = { newdawn: "NewDawn", hillsgold: "Hillsgold", challenging: "DayOfChallenging",
    merryfrond: "MerryfrondsDay", deepsolace: "DeepSolace", artisansfaire: "ArtisansFaire", elvendawn: "Elvendawn",
    largesse: "MornOfLargesse", hazel: "HazelFestival", civilization: "CivilizationsDawn", ascension: "NightOfAscension",
    zanscup: "ZansCup", barreneve: "BarrenEve", embertide: "Embertide" };
  const wanted = Object.entries(holidays).filter(([kind]) => !TRIM_NAMES.length || TRIM_NAMES.includes(kind));
  if ( wanted.length ) {
    const switchCalendar = async (calendar, calendars) => {
      await set("calendars", calendars);
      await gm.reload();
      await useCalendar(gm, calendar);
      await ctx.player.reload();
      for ( const session of [gm, ctx.player] ) {
        await waitForCanvas(session, backdrop);
        await session.eval(() => ui.sidebar.collapse?.());
      }
      await hideNotifications(gm);
    };
    await switchCalendar("exandria", { exandria: true });
    try {
      for ( const [kind, holiday] of wanted ) {
        const { year, day } = await festivalDay(gm, 836, holiday);
        await setTime(ctx, { year, day, hour: 19, minute: 0 });
        await expectSkyTrim(gm, kind);
        await shoot(gm, `trims/festival-${kind}`);
      }
    } finally {
      await switchCalendar("harptos", {});
    }
  }

  // Each adventure on the bar, with the sky bare, open and then collapsed.
  await set("seasonTrim", "none");
  await setTime(ctx, { year: 1525, day: 100, hour: 21, minute: 0 });
  const adventures = await gm.eval(moduleId => Object.keys(game.settings.settings.get(`${moduleId}.barTrim`)?.choices ?? {})
    .filter(k => k !== "none"), MODULE_ID);
  for ( const kind of adventures.filter(k => !TRIM_NAMES.length || TRIM_NAMES.includes(k)) ) {
    await set("barTrim", kind);
    await gm.page.waitForFunction(kind => document.getElementById("sdl-calendar")?.dataset.barTrim === kind, kind);
    await shoot(gm, `trims/bar-${kind}`);
    await gm.page.locator("#sdl-calendar button[data-action=toggleCalendar]").click();
    await gm.page.waitForTimeout(400);
    await shoot(gm, `trims/bar-${kind}-collapsed`, { ...CLIP, height: 80 });
    await gm.page.locator("#sdl-calendar button[data-action=toggleCalendar]").click();
    await gm.page.waitForTimeout(400);
  }
  await set("barTrim", "none");
}

/**
 * The first day a festival of the Calendar of Harptos falls on, from a year onwards. Shieldmeet falls only in leap
 * years.
 * @param {Session} gm
 * @param {number} from      The year to look from.
 * @param {string} festival  The last part of its name's localization key, such as "Midwinter".
 * @returns {Promise<{year: number, day: number}>}
 */
async function festivalDay(gm, from, festival) {
  const found = await gm.eval(({ from, festival }) => {
    const calendar = game.time.calendar;
    for ( let year = from; year < from + 8; year++ ) {
      const y = year - calendar.years.yearZero;
      for ( let day = 0; day < 400; day++ ) {
        const components = calendar.timeToComponents(calendar.componentsToTime({ year: y, day, hour: 12, minute: 0 }));
        if ( components.year !== y ) break;
        if ( calendar.findFestivalDay?.(components)?.name.endsWith(`.${festival}`) ) return { year, day };
      }
    }
    return null;
  }, { from, festival });
  if ( !found ) throw new Error(`${festival} doesn't fall within eight years of ${from}.`);
  return found;
}

/**
 * Check the calendar shows the sky's trim expected, so a shot isn't taken of the wrong one.
 * @param {Session} gm
 * @param {string} kind
 */
async function expectSkyTrim(gm, kind) {
  await gm.page.waitForFunction(kind => document.getElementById("sdl-calendar")?.dataset.skyTrim === kind, kind,
    { timeout: 10_000 });
}

/**
 * Wait until a user's canvas has drawn the backdrop scene, or whichever scene is active when there is none, and its
 * textures have loaded.
 * @param {Session} session
 * @param {string|null} backdrop
 */
async function waitForCanvas(session, backdrop) {
  await session.page.waitForFunction(name => canvas?.ready && !canvas.loading
    && (!name || (canvas.scene?.name === name)), backdrop, { timeout: 60_000, polling: 250 });
  await session.page.waitForTimeout(500);
}
