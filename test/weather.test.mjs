import { describe, expect, it } from "vitest";
import { WEATHER_KINDS, weatherKind, weatherPicture } from "../scripts/weather.mjs";

const SIZE = { width: 320, height: 120 };

describe("the weather in the sky", () => {
  it("matches Foundry's own weather effects", () => {
    expect(weatherKind("rain")).toBe("rain");
    expect(weatherKind("rainStorm")).toBe("storm");
    expect(weatherKind("snow")).toBe("snow");
    expect(weatherKind("blizzard")).toBe("blizzard");
    expect(weatherKind("fog")).toBe("fog");
    expect(weatherKind("leaves")).toBe("leaves");
  });

  it("matches other modules' weather by the words in its id", () => {
    expect(weatherKind("heavyThunderstorm")).toBe("storm");
    expect(weatherKind("lightDrizzle")).toBe("rain");
    expect(weatherKind("sleet")).toBe("snow");
    expect(weatherKind("morningMist")).toBe("fog");
    expect(weatherKind("overcast")).toBe("clouds");
  });

  it("shows nothing for no weather or weather it doesn't know", () => {
    expect(weatherKind("")).toBe("");
    expect(weatherKind(null)).toBe("");
    expect(weatherKind("embers")).toBe("");
    expect(weatherPicture("", SIZE)).toBe("");
  });

  it("draws every kind, the same each time", () => {
    for ( const kind of WEATHER_KINDS ) {
      const picture = weatherPicture(kind, SIZE);
      expect(picture.length, kind).toBeGreaterThan(100);
      expect(weatherPicture(kind, SIZE), kind).toBe(picture);
    }
  });

  it("draws each falling layer twice, one fall apart, so it loops", () => {
    const picture = weatherPicture("rain", SIZE);
    expect(picture).toContain("--fall-y: 120px");
    expect(picture).toContain(`translate(30 -120)`);
    expect(picture).toContain("--fall-x: -30px");
  });

  it("draws snow and leaves with Foundry's own particles", () => {
    expect(weatherPicture("snow", SIZE)).toContain(`href="ui/particles/snow.png"`);
    expect(weatherPicture("leaves", SIZE)).toMatch(/href="ui\/particles\/leaf[1-6]\.png"/);
    expect(weatherPicture("snow", SIZE, "/game/ui/particles/")).toContain(`href="/game/ui/particles/snow.png"`);
  });

  it("gives clouds to rain and storms, darker for storms, with lightning", () => {
    expect(weatherPicture("rain", SIZE)).toContain("sdl-weather-clouds\"");
    expect(weatherPicture("storm", SIZE)).toContain("sdl-weather-clouds dark");
    expect(weatherPicture("storm", SIZE)).toContain("sdl-weather-flash");
    expect(weatherPicture("rain", SIZE)).not.toContain("sdl-weather-flash");
    expect(weatherPicture("fog", SIZE)).not.toContain("sdl-cloud\"");
  });
});
