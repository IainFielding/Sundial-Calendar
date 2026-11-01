import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOONS } from "../scripts/moons.mjs";
import { DEFAULT_SUNS, SUNS } from "../scripts/suns.mjs";

const strings = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
const lookup = key => key.split(".").reduce((o, k) => o?.[k], strings);

describe("the sun catalogue", () => {
  it("gives a sun to every calendar that has moons", () => {
    expect(Object.keys(SUNS).sort()).toEqual(Object.keys(MOONS).sort());
  });

  it("names Oerth's sun Liga", () => {
    expect(SUNS.greyhawk.map(s => s.name)).toEqual(["SDL.Sun.Liga"]);
  });

  it("gives every sun a name in the language file, a colour and its own id", () => {
    for ( const suns of [...Object.values(SUNS), DEFAULT_SUNS] ) {
      expect(new Set(suns.map(s => s.id)).size).toBe(suns.length);
      for ( const sun of suns ) {
        expect(typeof lookup(sun.name), sun.name).toBe("string");
        expect(sun.color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});
