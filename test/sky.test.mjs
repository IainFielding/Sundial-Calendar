import { describe, expect, it } from "vitest";
import * as sky from "../scripts/sky.mjs";
import { makeCalendar } from "./helpers/foundry-shims.mjs";

const HOUR = 3600;
const DAY = 24 * HOUR;

/** Twelve 30-day months, with Harptos-style seasons counted in days, one of them running over the new year. */
const calendar = makeCalendar({
  months: Array.from({ length: 12 }, (_, i) => ({ name: `Month ${i + 1}`, ordinal: i + 1, days: 30 })),
  seasons: [
    { name: "DND5E.CALENDAR.Harptos.Season.Spring", dayStart: 79, dayEnd: 171 },
    { name: "DND5E.CALENDAR.Harptos.Season.Summer", dayStart: 172, dayEnd: 263 },
    { name: "DND5E.CALENDAR.Harptos.Season.Fall", dayStart: 264, dayEnd: 353 },
    { name: "DND5E.CALENDAR.Harptos.Season.Winter", dayStart: 354, dayEnd: 78 }
  ]
});

describe("the day wheel", () => {
  it("measures the day from midnight", () => {
    expect(sky.dayFraction(calendar, 0)).toBe(0);
    expect(sky.dayFraction(calendar, 12 * HOUR)).toBe(0.5);
    expect(sky.dayFraction(calendar, (3 * DAY) + (18 * HOUR))).toBe(0.75);
  });

  it("measures times before the epoch the same way", () => {
    expect(sky.dayFraction(calendar, -6 * HOUR)).toBe(0.75);
  });

  it("turns the day half down at noon and the night half down at midnight", () => {
    expect(sky.wheelRotation(0.5)).toBe(0);
    expect(Math.abs(sky.wheelRotation(0))).toBe(180);
    expect(sky.wheelRotation(0.25)).toBe(-90);
    expect(sky.wheelRotation(0.75)).toBe(90);
  });

  it("names the part of the day", () => {
    expect(sky.dayPhase(2)).toBe("night");
    expect(sky.dayPhase(5)).toBe("dawn");
    expect(sky.dayPhase(6)).toBe("dawn");
    expect(sky.dayPhase(6.5)).toBe("day");
    expect(sky.dayPhase(18)).toBe("dusk");
    expect(sky.dayPhase(19)).toBe("dusk");
    expect(sky.dayPhase(19.5)).toBe("night");
  });

  it("follows the calendar's own sunrise and sunset", () => {
    expect(sky.dayPhase(6.5, 8, 16)).toBe("night");
    expect(sky.dayPhase(7.5, 8, 16)).toBe("dawn");
    expect(sky.dayPhase(16.5, 8, 16)).toBe("dusk");
  });

  it("puts the sun on the horizon at sunrise and sunset, high by day and low by night", () => {
    expect(sky.sunHeight(6)).toBeCloseTo(0);
    expect(sky.sunHeight(18)).toBeCloseTo(0);
    expect(sky.sunHeight(12)).toBeCloseTo(sky.SUN_HEIGHT);
    expect(sky.sunHeight(0)).toBeCloseTo(-sky.SUN_HEIGHT);
    expect(sky.sunHeight(9)).toBeGreaterThan(0);
    expect(sky.sunHeight(21)).toBeLessThan(0);
  });

  it("is light by day and dark at night", () => {
    expect(sky.darkness(12)).toBe(0);
    expect(sky.darkness(15)).toBe(0);
    expect(sky.darkness(0)).toBe(1);
    expect(sky.darkness(22)).toBe(1);
  });

  it("fades through the late afternoon and twilight, a third dark at sunset", () => {
    const dusk = [16.5, 17, 17.5, 18, 18.5, 19, 19.5].map(h => sky.darkness(h));
    for ( let i = 1; i < dusk.length; i++ ) expect(dusk[i]).toBeGreaterThanOrEqual(dusk[i - 1]);
    expect(sky.darkness(17)).toBeGreaterThan(0);
    expect(sky.darkness(17)).toBeLessThan(0.1);
    expect(sky.darkness(18)).toBe(0.3);
    expect(sky.darkness(18.5)).toBeGreaterThan(0.5);
    expect(sky.darkness(18.5)).toBeLessThan(0.85);
    expect(sky.darkness(19.5)).toBe(1);
  });

  it("lightens through dawn as it darkened through dusk", () => {
    for ( const h of [0.5, 1, 1.5] ) expect(sky.darkness(6 - h)).toBeCloseTo(sky.darkness(18 + h));
  });

  it("fades as long every evening, whatever the length of the day", () => {
    for ( const h of [-1, -0.5, 0, 0.5, 1] ) {
      expect(sky.darkness(16 + h, 8, 16)).toBeCloseTo(sky.darkness(18 + h));
      expect(sky.darkness(20 + h, 4, 20)).toBeCloseTo(sky.darkness(18 + h));
    }
  });

  it("is lighter under a full moon high in the sky, and not under a moon that has set", () => {
    expect(sky.moonlight(0, [0.5])).toBeCloseTo(1);
    expect(sky.moonlight(0, [0])).toBe(0);
    expect(sky.moonlight(0, [0.25])).toBeCloseTo(0);
    expect(sky.darkness(0, 6, 18, 24, sky.moonlight(0, [0.5]))).toBe(1 - sky.MOONLIGHT);
    expect(sky.darkness(0, 6, 18, 24, sky.moonlight(0, [0.5, 0]))).toBe(1 - sky.MOONLIGHT);
  });

  it("puts the sun on the right-hand horizon at sunrise, overhead at noon and on the left at sunset", () => {
    expect(sky.sunSkyAngle(0.25)).toBeCloseTo(0);
    expect(sky.sunSkyAngle(0.5)).toBeCloseTo(Math.PI / 2);
    expect(sky.sunSkyAngle(0.75)).toBeCloseTo(Math.PI);
  });

  it("keeps the sun to a long summer day's sunrise and sunset, and under the horizon through the short night", () => {
    // Sunrise at 04:00 and sunset at 20:00.
    const [rise, set] = [4 / 24, 20 / 24];
    expect(sky.sunSkyAngle(rise, rise, set)).toBeCloseTo(0);
    expect(sky.sunSkyAngle(0.5, rise, set)).toBeCloseTo(Math.PI / 2);
    expect(sky.sunSkyAngle(set, rise, set)).toBeCloseTo(Math.PI);
    expect(sky.sunSkyAngle(0, rise, set)).toBeCloseTo(Math.PI * 1.5);
    expect(sky.aboveHorizon(sky.sunSkyAngle(5 / 24, rise, set))).toBe(true);
    expect(sky.aboveHorizon(sky.sunSkyAngle(21 / 24, rise, set))).toBe(false);
  });

  it("moves the moons with the season's sun: a summer full moon rises at sunset", () => {
    const [rise, set] = [4 / 24, 20 / 24];
    expect(sky.moonSkyAngle(set, 0.5, rise, set)).toBeCloseTo(0);
    expect(sky.moonSkyAngle(0, 0.5, rise, set)).toBeCloseTo(Math.PI / 2);
    expect(sky.moonSkyAngle(0.5, 0, rise, set)).toBeCloseTo(sky.sunSkyAngle(0.5, rise, set));
  });

  it("lets a second sun trail the first by its offset", () => {
    const sun = { id: "b", name: "B", color: "#ffffff", offset: 2 };
    expect(sky.sunAngle(8 / 24, sun, 24)).toBeCloseTo(0);
    expect(sky.sunAngle(0.5, { ...sun, offset: 0 }, 24)).toBeCloseTo(Math.PI / 2);
  });

  it("fades the day into the night across the hour either side of sunrise and sunset", () => {
    const { core, day, glow } = sky.twilightPaths(6, 18, 24, 100, 4);
    // The whole day face runs from seven round to five.
    expect(core).toBe("M0,0 L96.59,25.88 A100 100 0 0 1 -96.59,25.88 Z");
    expect(day).toHaveLength(8);
    expect(glow).toHaveLength(8);
    // The widest fade reaches from seven back to five, faintly; the narrowest, beside the core, is nearly whole.
    expect(day.at(-2).d).toBe("M0,0 L-96.59,25.88 A100 100 0 0 1 -96.59,-25.88 Z");
    expect(day.at(-2).opacity).toBeLessThan(0.1);
    expect(day[0].opacity).toBeGreaterThan(0.5);
    // Stacked, the layers show the day's colour fading from whole beside the core to nothing at the far side.
    const shown = j => 1 - day.filter((_, i) => i % 2 === 0).slice(j).reduce((left, { opacity }) => left * (1 - opacity), 1);
    expect(shown(0)).toBeCloseTo(1 - ((0.125 ** 2) * (3 - 0.25)), 2);
    expect(shown(3)).toBeLessThan(shown(2));
    // The glow is strongest over sunrise itself.
    const strongest = 1 - glow.filter((_, i) => i % 2 === 0).reduce((left, { opacity }) => left * (1 - opacity), 1);
    expect(strongest).toBeLessThan(sky.TWILIGHT_GLOW);
    expect(strongest).toBeGreaterThan(sky.TWILIGHT_GLOW * 0.9);
  });

  it("meets the blends in the middle of a short night, and leaves no core on a short day", () => {
    const short = sky.twilightPaths(0.5, 23.5, 24, 100, 1);
    expect(short.day[1].d).toMatch(/^M0,0 L0,-100 /);
    expect(sky.twilightPaths(11.5, 12.5, 24, 100).core).toBe("");
  });

  it("reddens the sun towards the horizon", () => {
    expect(sky.sunColor("#ffd45c", Math.PI / 2)).toBe("#ffd45c");
    expect(sky.sunColor("#ffd45c", 0)).toBe(sky.SUN_LOW_COLOR);
    expect(sky.mixColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("the length of the day", () => {
  it("has its longest day halfway from the start of spring to the start of autumn", () => {
    expect(sky.midsummer(calendar)).toBe(170.5);
  });

  it("has sixteen hours of daylight at midsummer and eight at midwinter", () => {
    expect(sky.daylight(calendar, { day: 170.5 })).toEqual({ sunrise: 4, sunset: 20 });
    expect(sky.daylight(calendar, { day: 350.5 })).toEqual({ sunrise: 8, sunset: 16 });
  });

  it("has even days and nights at the equinoxes", () => {
    const { sunrise, sunset } = sky.daylight(calendar, { day: 80.5 });
    expect(sunrise).toBeCloseTo(6, 1);
    expect(sunset).toBeCloseTo(18, 1);
  });

  it("keeps a quarter of the day either side of noon for a calendar without seasons", () => {
    const plain = makeCalendar({ months: [{ ordinal: 1, days: 300 }] });
    expect(sky.midsummer(plain)).toBe(null);
    expect(sky.daylight(plain, { day: 100 })).toEqual({ sunrise: 6, sunset: 18 });
  });

  it("finds midsummer from summer, or from winter, when the other seasons are missing", () => {
    const months = [{ ordinal: 1, days: 360 }];
    const summer = makeCalendar({ months, seasons: [{ name: "Summer", dayStart: 151, dayEnd: 240 }] });
    expect(sky.midsummer(summer)).toBe(150);
    const winter = makeCalendar({ months, seasons: [{ name: "Winter", dayStart: 331, dayEnd: 60 }] });
    expect(sky.midsummer(winter)).toBe(150);
  });
});

describe("the season band", () => {
  it("reads the seasons' days, counted from 0 with the end exclusive", () => {
    expect(sky.seasonRanges(calendar).map(({ start, end }) => [start, end])).toEqual([
      [78, 171], [171, 263], [263, 353], [353, 78]
    ]);
  });

  it("reads seasons given in months", () => {
    const gregorian = makeCalendar({
      months: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((days, i) => ({ ordinal: i + 1, days })),
      seasons: [
        { name: "CALENDAR.GREGORIAN.Spring", monthStart: 3, monthEnd: 5 },
        { name: "CALENDAR.GREGORIAN.Winter", monthStart: 12, monthEnd: 2 }
      ]
    });
    expect(sky.seasonRanges(gregorian).map(({ start, end }) => [start, end])).toEqual([[59, 151], [334, 59]]);
  });

  it("knows a season by its name", () => {
    expect(sky.seasonKind("DND5E.CALENDAR.Harptos.Season.Fall")).toBe("fall");
    expect(sky.seasonKind("Autumn")).toBe("fall");
    expect(sky.seasonKind("CALENDAR.GREGORIAN.Winter")).toBe("winter");
    expect(sky.seasonKind("The Long Dark")).toBeNull();
  });

  it("blends each season into the next, carried over the new year", () => {
    const gradient = sky.seasonGradient(calendar);
    expect(gradient.startsWith("linear-gradient(90deg, ")).toBe(true);
    const stops = [...gradient.matchAll(/(#[0-9a-f]{6}) (-?[\d.]+)%/g)].map(([, color, at]) => [color, Number(at)]);
    expect(stops).toHaveLength(6);
    // Winter's middle falls in the first days of the year, so it is the first stop inside the year and also wraps
    // round as the last stop after it.
    expect(stops[1][0]).toBe(sky.SEASON_COLORS.winter);
    expect(stops.at(-1)[0]).toBe(sky.SEASON_COLORS.winter);
    expect(stops.at(-1)[1] - stops[1][1]).toBeCloseTo(100);
    expect(stops.map(([, at]) => at)).toEqual([...stops.map(([, at]) => at)].sort((a, b) => a - b));
  });

  it("draws a plain band for a calendar without seasons", () => {
    expect(sky.seasonGradient(makeCalendar({ months: [{ ordinal: 1, days: 100 }] }))).toMatch(/^linear-gradient/);
  });

  it("measures the year from its first moment", () => {
    expect(sky.yearFraction(calendar, { day: 180 }, 0)).toBe(0.5);
    expect(sky.yearFraction(calendar, { day: 0 }, 0.5)).toBeCloseTo(0.5 / 360);
  });
});

describe("the moons", () => {
  const moon = { id: "test", name: "Test", period: 30, color: "#fff", epoch: { year: 0, day: 10, hour: 12 } };

  it("is in its epoch phase at its epoch", () => {
    const epoch = sky.epochTime(calendar, moon);
    expect(epoch).toBe((10 * DAY) + (12 * HOUR));
    expect(sky.moonPhase(calendar, moon, epoch)).toBe(0);
    expect(sky.moonPhase(calendar, { ...moon, epochPhase: 0.5 }, epoch)).toBe(0.5);
  });

  it("goes through its phases over its period, before and after its epoch", () => {
    const epoch = sky.epochTime(calendar, moon);
    expect(sky.moonPhase(calendar, moon, epoch + (15 * DAY))).toBeCloseTo(0.5);
    expect(sky.moonPhase(calendar, moon, epoch + (30 * DAY))).toBeCloseTo(0);
    expect(sky.moonPhase(calendar, moon, epoch - (7.5 * DAY))).toBeCloseTo(0.75);
  });

  it("counts its epoch's year as the calendar shows it", () => {
    const shifted = makeCalendar({ months: calendar.months.values, yearZero: 1500 });
    expect(sky.epochTime(shifted, { ...moon, epoch: { year: 1502 } })).toBe(2 * 360 * DAY);
  });

  it("names its phase", () => {
    expect(sky.phaseName(0)).toBe("New");
    expect(sky.phaseName(0.97)).toBe("New");
    expect(sky.phaseName(0.25)).toBe("FirstQuarter");
    expect(sky.phaseName(0.5)).toBe("Full");
    expect(sky.phaseName(0.6)).toBe("WaningGibbous");
    expect(sky.phaseName(0.75)).toBe("LastQuarter");
  });

  it("is lit from none at new to all at full", () => {
    expect(sky.illumination(0)).toBeCloseTo(0);
    expect(sky.illumination(0.25)).toBeCloseTo(0.5);
    expect(sky.illumination(0.5)).toBeCloseTo(1);
  });

  it("rides highest at midnight when full, and keeps company with the sun when new", () => {
    expect(sky.moonSkyAngle(0, 0.5)).toBeCloseTo(Math.PI / 2);
    expect(sky.moonSkyAngle(0.5, 0)).toBeCloseTo(Math.PI / 2);
    expect(sky.aboveHorizon(sky.moonSkyAngle(0.5, 0.5))).toBe(false);
  });

  it("rides highest around dawn at last quarter", () => {
    expect(sky.moonSkyAngle(0.25, 0.75)).toBeCloseTo(Math.PI / 2);
  });

  it("is above the horizon only between rising and setting", () => {
    expect(sky.aboveHorizon(0)).toBe(false);
    expect(sky.aboveHorizon(1)).toBe(true);
    expect(sky.aboveHorizon(Math.PI)).toBe(false);
    expect(sky.aboveHorizon(4)).toBe(false);
  });

  it("finds its place on the bowl", () => {
    expect(sky.orbitPoint(Math.PI / 2, { x: 160, y: -40, r: 128 })).toEqual({ x: 160, y: 88 });
    expect(sky.orbitPoint(0, { x: 160, y: -40, r: 128 })).toEqual({ x: 288, y: -40 });
  });

  it("knows the days a moon is full or new", () => {
    // New at the start of year 1, so full fifteen days later.
    const moon = { id: "m", name: "M", period: 30, color: "#ffffff", epoch: { year: 1 } };
    const start = calendar.componentsToTime({ year: 1 });
    const on = day => sky.moonEvents(calendar, [moon], start + (day * DAY));
    expect(on(0)).toEqual({ full: [], new: [moon] });
    expect(on(14)).toEqual({ full: [], new: [] });
    expect(on(15)).toEqual({ full: [moon], new: [] });
    expect(on(16)).toEqual({ full: [], new: [] });
    expect(on(30)).toEqual({ full: [], new: [moon] });
  });

  it("finds a full moon that falls part way through the day", () => {
    const moon = { id: "m", name: "M", period: 30, color: "#ffffff", epoch: { year: 1, hour: 12 } };
    const start = calendar.componentsToTime({ year: 1 });
    expect(sky.moonEvents(calendar, [moon], start + (15 * DAY)).full).toEqual([moon]);
    expect(sky.moonEvents(calendar, [moon], start + (14 * DAY)).full).toEqual([]);
  });

  it("finds moons full together", () => {
    const a = { id: "a", name: "A", period: 28, color: "#ffffff", epoch: { year: 1 }, epochPhase: 0.5 };
    const b = { id: "b", name: "B", period: 91, color: "#ffffff", epoch: { year: 1 }, epochPhase: 0.5 };
    const start = calendar.componentsToTime({ year: 1 });
    expect(sky.moonEvents(calendar, [a, b], start).full).toEqual([a, b]);
    expect(sky.moonEvents(calendar, [a, b], start + (28 * DAY)).full).toEqual([a]);
  });

  describe("its lit face", () => {
    const sweeps = path => [...path.matchAll(/A[\d.]+ [\d.]+ 0 0 (\d)/g)].map(m => Number(m[1]));
    const terminatorWidth = path => Number(path.match(/A([\d.]+) [\d.]+ 0 0 \d [\d.]+ 0Z$/)[1]);

    it("is not drawn at new moon", () => {
      expect(sky.moonPath(0, 10)).toBe("");
    });

    it("is a whole disc at full moon", () => {
      expect(terminatorWidth(sky.moonPath(0.5, 10))).toBe(10);
    });

    it("is lit from the right while waxing and from the left while waning", () => {
      expect(sweeps(sky.moonPath(0.1, 10))[0]).toBe(1);
      expect(sweeps(sky.moonPath(0.9, 10))[0]).toBe(0);
    });

    it("bulges its terminator towards the light as a crescent and away as gibbous", () => {
      expect(sweeps(sky.moonPath(0.1, 10))[1]).toBe(0); // Waxing crescent: terminator bows right.
      expect(sweeps(sky.moonPath(0.4, 10))[1]).toBe(1); // Waxing gibbous: bows left.
      expect(sweeps(sky.moonPath(0.9, 10))[1]).toBe(1); // Waning crescent: bows left.
      expect(sweeps(sky.moonPath(0.6, 10))[1]).toBe(0); // Waning gibbous: bows right.
    });

    it("has a straight terminator at the quarters", () => {
      expect(terminatorWidth(sky.moonPath(0.25, 10))).toBe(0);
      expect(terminatorWidth(sky.moonPath(0.75, 10))).toBe(0);
    });
  });
});

describe("the Tears of Selûne", () => {
  const orbit = { x: 160, y: -40, r: 128 };
  const MOON_RADIUS = 13;

  it("trail behind the moon along its path, thinning as they go", () => {
    const angle = Math.PI / 2;
    let last = angle;
    for ( const glint of sky.TEARS ) {
      const { angle: at } = sky.trailPoint(angle, glint, orbit);
      expect(at).toBeLessThan(last);
      last = at;
    }
    const sizes = sky.TEARS.map(g => g.r);
    expect(sizes.at(-1)).toBeLessThan(sizes[0]);
  });

  it("start clear of the moon's face", () => {
    const angle = Math.PI / 2;
    const moon = sky.orbitPoint(angle, orbit);
    for ( const glint of sky.TEARS ) {
      const { x, y } = sky.trailPoint(angle, glint, orbit);
      expect(Math.hypot(x - moon.x, y - moon.y)).toBeGreaterThan(MOON_RADIUS + glint.r);
    }
  });

  it("wrap round past the horizon with the moon", () => {
    const { angle } = sky.trailPoint(0.05, sky.TEARS[0], orbit);
    expect(angle).toBeGreaterThan(Math.PI);
    expect(sky.aboveHorizon(angle)).toBe(false);
  });
});

describe("the warm light of dawn and dusk", () => {
  it("has none in the middle of the day or the night", () => {
    expect(sky.goldenLight(12).intensity).toBe(0);
    expect(sky.goldenLight(0).intensity).toBe(0);
    expect(sky.goldenLight(23).intensity).toBe(0);
  });

  it("is warmest with the sun on the horizon, and fades either side", () => {
    const evening = [16.5, 17, 17.5, 18, 18.25, 18.5, 18.75].map(h => sky.goldenLight(h).intensity);
    expect(sky.goldenLight(18).intensity).toBe(sky.GOLDEN_INTENSITY);
    expect(Math.max(...evening)).toBe(sky.GOLDEN_INTENSITY);
    for ( let i = 1; i < 4; i++ ) expect(evening[i]).toBeGreaterThan(evening[i - 1]);
    for ( let i = 4; i < evening.length; i++ ) expect(evening[i]).toBeLessThan(evening[i - 1]);
  });

  it("is gold in the morning and amber in the evening", () => {
    expect(sky.goldenLight(6).hue).toBe(sky.DAWN_HUE);
    expect(sky.goldenLight(5).hue).toBe(sky.DAWN_HUE);
    expect(sky.goldenLight(18).hue).toBe(sky.DUSK_HUE);
    expect(sky.goldenLight(19).hue).toBe(sky.DUSK_HUE);
  });

  it("follows the sunrise and sunset it is given", () => {
    expect(sky.goldenLight(20, 4, 20).intensity).toBe(sky.GOLDEN_INTENSITY);
    expect(sky.goldenLight(19.5, 4, 20).intensity).toBeGreaterThan(0);
    expect(sky.goldenLight(19.5, 4, 20).intensity).toBeLessThan(sky.GOLDEN_INTENSITY);
    expect(sky.goldenLight(18, 4, 20).intensity).toBe(0);
  });
});
