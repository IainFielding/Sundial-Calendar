/**
 * The e2e test runner, and the helpers tests use to drive the world through its real UI.
 */

import fs from "node:fs";
import { MODULE_ID } from "../config.mjs";

/* -------------------------------------------- */
/*  Runner                                      */
/* -------------------------------------------- */

const tests = [];

/**
 * Register a test.
 * @param {string} name
 * @param {(ctx: TestContext) => Promise<void>} fn
 */
export function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * @typedef {object} TestContext
 * @property {import("./session.mjs").Session} gm
 * @property {import("./session.mjs").Session} player
 */

/**
 * Run every registered test in order. A failure is recorded with a screenshot of each browser, and the run
 * carries on.
 * @param {TestContext} ctx
 * @param {object} [options]
 * @param {string} [options.filter]  Only run tests whose name contains this.
 * @param {(ctx: TestContext) => Promise<void>} [options.beforeEach]
 * @returns {Promise<{ passed: number, failed: { name: string, error: string }[] }>}
 */
export async function runTests(ctx, { filter, beforeEach } = {}) {
  // A screenshot from an earlier run would look like a failure of this one.
  for ( const file of fs.readdirSync("test-e2e") ) {
    if ( /^fail-\d+-(gm|player)\.png$/.test(file) ) fs.rmSync(`test-e2e/${file}`);
  }
  const failed = [];
  let passed = 0;
  for ( const [i, { name, fn }] of tests.entries() ) {
    if ( filter && !name.toLowerCase().includes(filter.toLowerCase()) ) continue;
    const started = Date.now();
    try {
      await beforeEach?.(ctx);
      await fn(ctx);
      passed++;
      console.log(`  ok    ${name} (${Date.now() - started}ms)`);
    } catch ( err ) {
      const slug = `fail-${String(i + 1).padStart(2, "0")}`;
      await ctx.gm.page.screenshot({ path: `test-e2e/${slug}-gm.png` }).catch(() => {});
      await ctx.player.page.screenshot({ path: `test-e2e/${slug}-player.png` }).catch(() => {});
      const error = `${err.message}\n--- GM console ---\n${ctx.gm.tail(12)}\n--- Player console ---\n${ctx.player.tail(12)}`;
      failed.push({ name, error });
      console.log(`  FAIL  ${name}\n${indent(err.message)}\n        screenshots: test-e2e/${slug}-*.png`);
    }
  }
  return { passed, failed };
}

/**
 * @param {string} text
 * @returns {string}
 */
function indent(text) {
  return text.split("\n").slice(0, 12).map(line => `        ${line}`).join("\n");
}

/* -------------------------------------------- */
/*  Assertions                                  */
/* -------------------------------------------- */

/**
 * @param {*} condition
 * @param {string} message
 */
export function assert(condition, message) {
  if ( !condition ) throw new Error(message);
}

/**
 * @param {*} actual
 * @param {*} expected
 * @param {string} what
 */
export function assertEqual(actual, expected, what) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if ( a !== e ) throw new Error(`${what}: expected ${e}, got ${a}`);
}

/**
 * Wait until a function run in the world returns something truthy, and return it.
 * @param {import("./session.mjs").Session} session
 * @param {Function} fn
 * @param {*} [arg]
 * @param {string} [what]  Described in the error if it never happens.
 * @param {number} [timeout=10000]
 */
export async function waitFor(session, fn, arg, what = "condition", timeout = 10_000) {
  try {
    const handle = await session.page.waitForFunction(fn, arg, { timeout, polling: 100 });
    return handle.jsonValue();
  } catch ( err ) {
    // A check that throws is a broken test, not a slow one, so its own error is kept.
    if ( err.name !== "TimeoutError" ) throw err;
    throw new Error(`Timed out waiting for ${what} (${session.user}).`, { cause: err });
  }
}

/* -------------------------------------------- */
/*  World Helpers                               */
/* -------------------------------------------- */

/**
 * Set the world time to a moment given as the calendar shows it, and wait until both users' calendars show it.
 * @param {TestContext} ctx
 * @param {{year: number, day: number, hour?: number, minute?: number}} when  The year as the calendar shows it.
 * @returns {Promise<number>}  The world time.
 */
export async function setTime({ gm, player }, when) {
  const time = await gm.eval(async ({ year, day, hour = 0, minute = 0 }) => {
    const calendar = game.time.calendar;
    return game.time.set(calendar.componentsToTime({ year: year - calendar.years.yearZero, day, hour, minute }));
  }, when);
  for ( const session of [gm, player] ) await waitForShown(session, time);
  return time;
}

/**
 * Wait until a user's calendar has finished drawing a world time.
 * @param {import("./session.mjs").Session} session
 * @param {number} time
 */
export function waitForShown(session, time) {
  return waitFor(session, time => {
    const app = dnd5e.ui.calendar;
    return (game.time.worldTime === time) && (app?.shownTime === time) && !app.animating;
  }, time, `the calendar to show ${time}`);
}

/**
 * The module's settings for one user, set without waiting for a render.
 * @param {import("./session.mjs").Session} session
 * @param {Record<string, *>} values
 */
export function setClientSettings(session, values) {
  return session.eval(async ({ moduleId, values }) => {
    for ( const [key, value] of Object.entries(values) ) {
      if ( game.settings.get(moduleId, key) !== value ) await game.settings.set(moduleId, key, value);
    }
  }, { moduleId: MODULE_ID, values });
}

/**
 * Read what a user's calendar shows.
 * @param {import("./session.mjs").Session} session
 */
export function readCalendar(session) {
  return session.eval(() => {
    const root = document.getElementById("sdl-calendar");
    if ( !root ) return null;
    const text = selector => root.querySelector(selector)?.innerText.trim() ?? null;
    const visibleMoons = [...root.querySelectorAll(".sdl-moon")].filter(m => !m.hidden);
    return {
      inUiTop: root.parentElement?.id === "ui-top",
      expanded: root.classList.contains("expanded"),
      visualHeight: root.querySelector(".sdl-visual").getBoundingClientRect().height,
      time: text(".sdl-time"),
      date: text(".sdl-date"),
      wheel: root.querySelector(".sdl-wheel")?.getAttribute("transform"),
      phase: root.dataset.dayPhase,
      season: root.querySelector(".sdl-season")?.dataset.seasonName || null,
      seasonTooltip: root.querySelector(".sdl-season")?.dataset.tooltip || null,
      skyTrim: root.dataset.skyTrim || null,
      barTrim: root.dataset.barTrim || null,
      festival: root.querySelector(".sdl-festival-icon")?.hidden ? null
        : root.querySelector(".sdl-festival-icon")?.dataset.tooltip,
      moons: visibleMoons.map(m => m.dataset.tooltip),
      moonEvents: root.querySelector(".sdl-moon-event-icon")?.hidden ? null
        : root.querySelector(".sdl-moon-event-icon")?.dataset.tooltip,
      controls: [...root.querySelectorAll(".sdl-controls > .calendar-button > button")].map(b => b.dataset.action)
    };
  });
}
