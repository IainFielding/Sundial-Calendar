import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALENDAR_OF_EXANDRIA } from "../scripts/calendars.mjs";
import { BAR_OUTLINE, BAR_TRIM_CHOICES, BAR_TRIM_KINDS, barTrim, BOWL_OUTLINE, festivalTrimKind, SKY_TRIM_CHOICES, skyTrim,
  skyTrimKind } from "../scripts/trim.mjs";

const strings = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
const barTrimName = kind => strings.SDL.Settings.BarTrim[kind.charAt(0).toUpperCase() + kind.slice(1)];

describe("the season trim", () => {
  it("walks the bar's lower edge from corner to corner", () => {
    const start = BAR_OUTLINE.at(0);
    const middle = BAR_OUTLINE.at(BAR_OUTLINE.length / 2);
    const end = BAR_OUTLINE.at(BAR_OUTLINE.length);
    expect([start.x, start.y]).toEqual([1, expect.closeTo(0, 6)]);
    expect([middle.x, middle.y]).toEqual([expect.closeTo(300, 6), 39]);
    expect([end.x, end.y]).toEqual([599, expect.closeTo(0, 6)]);
    expect(middle.n).toBeCloseTo(Math.PI / 2);
  });

  it("walks the bowl's rim from the band down and back up", () => {
    expect(BOWL_OUTLINE.at(0).y).toBeCloseTo(0);
    expect(BOWL_OUTLINE.at(BOWL_OUTLINE.length / 2).y).toBeCloseTo(120);
    expect(BOWL_OUTLINE.at(BOWL_OUTLINE.length).y).toBeCloseTo(0);
  });

  it("dresses the sky about the day wheel for each kind of season", () => {
    const pieces = { winter: "sdl-icicle", spring: "sdl-blossom", summer: "sdl-sunflower", fall: "sdl-fallen" };
    for ( const [kind, piece] of Object.entries(pieces) ) {
      const trim = skyTrim(kind);
      expect(trim).toContain(piece);
      expect(trim).not.toContain("middle");
    }
  });

  it("leaves the bar over the date marked, so it can be left bare", () => {
    expect(barTrim("chult")).toContain(" middle");
  });

  it("comes out the same each time", () => {
    expect(skyTrim("spring")).toEqual(skyTrim("spring"));
    expect(barTrim("feywild")).toEqual(barTrim("feywild"));
  });

  it("draws nothing for no known kind, and keeps the sky's and the bar's apart", () => {
    expect(skyTrim(null)).toBe("");
    expect(barTrim(null)).toBe("");
    expect(skyTrim("ravenloft")).toBe("");
    expect(barTrim("winter")).toBe("");
  });
});

describe("the festivals' and adventures' trim", () => {
  it("dresses the sky for each festival of D&D 5e's calendars", () => {
    const festivals = {
      "DND5E.CALENDAR.Harptos.Festival.Midwinter": "midwinter",
      "DND5E.CALENDAR.Greyhawk.Festival.Needfest": "midwinter",
      "DND5E.CALENDAR.Harptos.Festival.Greengrass": "greengrass",
      "DND5E.CALENDAR.Greyhawk.Festival.Growfest": "greengrass",
      "DND5E.CALENDAR.Harptos.Festival.Midsummer": "midsummer",
      "DND5E.CALENDAR.Greyhawk.Festival.Richfest": "midsummer",
      "DND5E.CALENDAR.Harptos.Festival.Shieldmeet": "shieldmeet",
      "DND5E.CALENDAR.Harptos.Festival.Highharvestide": "harvest",
      "DND5E.CALENDAR.Greyhawk.Festival.Brewfest": "harvest",
      "DND5E.CALENDAR.Harptos.Festival.FeastOfTheMoon": "moonfeast",
      "SDL.Calendar.Exandria.Festival.RenewalFestival": "greengrass",
      "SDL.Calendar.Exandria.Festival.Zenith": "midsummer",
      "SDL.Calendar.Exandria.Festival.HarvestsClose": "harvest",
      "SDL.Calendar.Exandria.Festival.WintersCrest": "midwinter"
    };
    for ( const [name, kind] of Object.entries(festivals) ) {
      expect(festivalTrimKind(name)).toBe(kind);
      expect(skyTrim(kind), kind).toMatch(/^<.*>$/s);
      expect(skyTrim(kind), kind).not.toMatch(/NaN|undefined/);
    }
    expect(festivalTrimKind("")).toBeNull();
  });

  it("dresses the sky for every holiday of the Exandrian calendar", () => {
    for ( const { name } of CALENDAR_OF_EXANDRIA.festivals ) {
      const kind = festivalTrimKind(name);
      expect(kind, name).toBeTruthy();
      expect(skyTrim(kind), name).toMatch(/^<.*>$/s);
      expect(skyTrim(kind), name).not.toMatch(/NaN|undefined/);
    }
  });

  it("dresses the bar for each adventure", () => {
    for ( const kind of BAR_TRIM_CHOICES.slice(1) ) {
      expect(barTrim(kind), kind).toMatch(/^<.*>$/s);
      expect(barTrim(kind), kind).not.toMatch(/NaN|undefined/);
    }
  });

  it("draws no season with NaN or undefined in it", () => {
    for ( const kind of ["winter", "spring", "summer", "fall"] ) expect(skyTrim(kind), kind).not.toMatch(/NaN|undefined/);
  });
});

describe("the GM's choice of trim", () => {
  it("offers every choice once, none first", () => {
    for ( const choices of [SKY_TRIM_CHOICES, BAR_TRIM_CHOICES] ) {
      expect(new Set(choices).size).toBe(choices.length);
      expect(choices[0]).toBe("none");
    }
    expect(SKY_TRIM_CHOICES).toEqual(["none", "follow", "winter", "spring", "summer", "fall"]);
  });

  it("offers every adventure and setting, named and in order of name", () => {
    expect([...BAR_TRIM_CHOICES.slice(1)].sort()).toEqual([...BAR_TRIM_KINDS].sort());
    const names = BAR_TRIM_CHOICES.map(barTrimName);
    for ( const [i, name] of names.entries() ) expect(typeof name, BAR_TRIM_CHOICES[i]).toBe("string");
    const sortable = names.slice(1).map(n => n.replace(/^The /, "").toLowerCase());
    expect(sortable).toEqual([...sortable].sort());
  });

  it("puts up a festival's trim for the day while following the seasons", () => {
    expect(skyTrimKind("follow", "winter", "midwinter")).toBe("midwinter");
    expect(skyTrimKind("winter", "winter", "midwinter")).toBe("winter");
    expect(skyTrimKind("none", "winter", "midwinter")).toBeNull();
  });

  it("is bare by default", () => {
    expect(skyTrimKind("none", "winter")).toBeNull();
  });

  it("follows the seasons", () => {
    expect(skyTrimKind("follow", "spring")).toBe("spring");
    expect(skyTrimKind("follow", null)).toBeNull();
  });

  it("keeps to one season all year", () => {
    for ( const kind of ["winter", "spring", "summer", "fall"] ) expect(skyTrimKind(kind, "summer")).toBe(kind);
  });

  it("follows the seasons for a world that turned the old setting on", () => {
    expect(skyTrimKind(true, "fall")).toBe("fall");
    expect(skyTrimKind("true", "fall")).toBe("fall");
    expect(skyTrimKind(false, "fall")).toBeNull();
  });
});
