import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOONS } from "../scripts/moons.mjs";
import * as sky from "../scripts/sky.mjs";
import { makeCalendar } from "./helpers/foundry-shims.mjs";

const strings = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
const lookup = key => key.split(".").reduce((o, k) => o?.[k], strings);

describe("the moon catalogue", () => {
  it("has moons for each of D&D 5e's calendars and the module's additional ones", () => {
    expect(Object.keys(MOONS).sort()).toEqual(["exandria", "gregorian", "greyhawk", "harptos", "khorvaire", "krynn"]);
    expect(MOONS.khorvaire).toHaveLength(12);
  });

  it("gives every moon a name in the language file, a period and a colour", () => {
    for ( const moon of Object.values(MOONS).flat() ) {
      expect(typeof lookup(moon.name), moon.name).toBe("string");
      expect(moon.period).toBeGreaterThan(0);
      expect(moon.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("gives each moon in a calendar its own id", () => {
    for ( const moons of Object.values(MOONS) ) {
      expect(new Set(moons.map(m => m.id)).size).toBe(moons.length);
    }
  });

  it("names every phase and moon event in the language file", () => {
    for ( const phase of sky.PHASES ) expect(typeof lookup(`SDL.MoonPhase.${phase}`), phase).toBe("string");
    for ( const event of ["Full", "FullTogether", "New"] ) expect(typeof lookup(`SDL.MoonEvent.${event}`)).toBe("string");
  });

  it("puts Selûne's 1372 DR full moon three-quarters of a day before 1501 DR", () => {
    // Shieldmeet falls in the years divisible by four, so from the start of 1372 DR to the start of 1501 DR there are
    // 129 years of 365 days and 33 Shieldmeets.
    const days = (129 * 365) + 33;
    const [selune] = MOONS.harptos;
    expect(selune.period).toBe(30.4375);
    expect(sky.wrap(days, selune.period)).toBeCloseTo(0.75);
    expect(selune.epoch.hour).toBe(-0.75 * 24);
    expect(selune.epochPhase).toBe(0.5);
  });

  it("makes each of Eberron's moons full in the middle of its own month in 998 YK", () => {
    const months = MOONS.khorvaire.map((_, i) => ({ ordinal: i + 1, days: 28 }));
    const calendar = makeCalendar({ months, yearZero: 998 });
    const day = 24 * 3600;
    MOONS.khorvaire.forEach((moon, i) => {
      const fifteenth = calendar.componentsToTime({ day: (28 * i) + 14 });
      expect(sky.phaseName(sky.moonPhase(calendar, moon, fifteenth)), moon.id).toBe("Full");
      expect(sky.moonPhase(calendar, moon, fifteenth - (7 * day)), moon.id).toBeLessThan(0.5);
    });
  });

  it("gives Selûne, and only Selûne, the Tears' trail", () => {
    const trailed = Object.values(MOONS).flat().filter(m => m.trail);
    expect(trailed.map(m => [m.id, m.trail])).toEqual([["selune", "tears"]]);
  });
});
