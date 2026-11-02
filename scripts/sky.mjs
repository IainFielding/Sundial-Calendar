/**
 * The sky maths behind the calendar's picture: where the day wheel points, which part of the day it is, where the
 * season bar sits, and the phase and place of each moon.
 *
 * Everything here is a pure function of a world time and a calendar, so it runs the same in the browser and in the
 * unit tests. A "calendar" is Foundry's CalendarData, or anything with the same `days`, `months` and `seasons`.
 */

export const TAU = Math.PI * 2;

/**
 * Wrap a number into [0, n).
 * @param {number} value
 * @param {number} n
 * @returns {number}
 */
export function wrap(value, n) {
  return ((value % n) + n) % n;
}

/**
 * The number of seconds in one day of a calendar.
 * @param {object} calendar
 * @returns {number}
 */
export function secondsPerDay(calendar) {
  const { secondsPerMinute, minutesPerHour, hoursPerDay } = calendar.days;
  return secondsPerMinute * minutesPerHour * hoursPerDay;
}

/**
 * How far through its day a world time is, from 0 at midnight towards 1 at the next midnight.
 * @param {object} calendar
 * @param {number} time  World time in seconds.
 * @returns {number}
 */
export function dayFraction(calendar, time) {
  const day = secondsPerDay(calendar);
  return wrap(time, day) / day;
}

/**
 * The day wheel's rotation in degrees. The wheel is drawn with its day half at the bottom, the part that shows, so
 * it turns that half to the bottom at noon and the night half there at midnight. Through the morning the day half
 * comes round from the right; through the evening it leaves to the left.
 * @param {number} fraction  Fraction of the day, from {@link dayFraction}.
 * @returns {number}
 */
export function wheelRotation(fraction) {
  return (fraction * 360) - 180;
}

/**
 * The sun's angle across the sky bowl, in radians: 0 on the right-hand horizon as it rises, π/2 at the bottom of
 * the bowl midway through the day, π on the left-hand horizon as it sets, and on round beneath the horizon through
 * the night. It crosses the sky at the pace that fits the day's length, so it rises and sets on time in every season.
 * @param {number} fraction    Fraction of the day, from {@link dayFraction}.
 * @param {number} [rise=0.25]  Sunrise, as a fraction of the day.
 * @param {number} [set=0.75]   Sunset, as a fraction of the day.
 * @returns {number}
 */
export function sunSkyAngle(fraction, rise = 0.25, set = 0.75) {
  const day = wrap(set - rise, 1) || 1;
  const since = wrap(fraction - rise, 1);
  if ( since <= day ) return wrap(Math.PI * since / day, TAU);
  return wrap(Math.PI + (Math.PI * (since - day) / ((1 - day) || 1)), TAU);
}

/**
 * Which part of the day an hour falls in. Dawn is the hour before sunrise up to sunrise, dusk is sunset to the hour
 * after it.
 * @param {number} hour            Decimal hours since midnight.
 * @param {number} [sunrise=6]     Sunrise, in hours.
 * @param {number} [sunset=18]     Sunset, in hours.
 * @returns {"dawn"|"day"|"dusk"|"night"}
 */
export function dayPhase(hour, sunrise = 6, sunset = 18) {
  if ( (hour >= sunrise - 1) && (hour <= sunrise) ) return "dawn";
  if ( (hour > sunrise) && (hour < sunset) ) return "day";
  if ( (hour >= sunset) && (hour <= sunset + 1) ) return "dusk";
  return "night";
}

/**
 * How high the sun climbs, and how far it sinks, in degrees. It rises and sinks at the same rate whatever the season,
 * along a quarter sine over a quarter of the day either side of the horizon, so the light fades as long every
 * evening: in a 24-hour day, civil twilight ends some twenty-five minutes after sunset, and night falls in earnest
 * after seventy.
 */
export const SUN_HEIGHT = 60;

/**
 * How dark it is with the sun at each height, in degrees: falling a little through the late afternoon, about a third
 * dark at sunset, and deepening through civil, nautical and astronomical twilight to full night.
 * @type {[number, number][]}
 */
export const DARKNESS_BY_SUN_HEIGHT = [[20, 0], [8, 0.1], [0, 0.3], [-6, 0.6], [-12, 0.85], [-18, 1]];

/**
 * How much the brightest moon lifts the dark of night: a full moon high overhead makes the night this much lighter.
 */
export const MOONLIGHT = 0.2;

/**
 * The sun's height above the horizon at an hour, in degrees: 0 at sunrise and sunset, rising and sinking at the same
 * rate every day towards {@link SUN_HEIGHT} above or below, and no further than halfway through a short day or night.
 * @param {number} hour             Decimal hours since midnight.
 * @param {number} [sunrise=6]      Sunrise, in hours.
 * @param {number} [sunset=18]      Sunset, in hours.
 * @param {number} [hoursPerDay=24]
 * @returns {number}
 */
export function sunHeight(hour, sunrise = 6, sunset = 18, hoursPerDay = 24) {
  const day = wrap(sunset - sunrise, hoursPerDay);
  const sinceSunrise = wrap(hour - sunrise, hoursPerDay);
  const up = sinceSunrise <= day;
  // Hours from the nearer of sunrise and sunset.
  const fromHorizon = up ? Math.min(sinceSunrise, day - sinceSunrise)
    : Math.min(sinceSunrise - day, hoursPerDay - sinceSunrise);
  const height = SUN_HEIGHT * Math.sin(Math.PI * Math.min(fromHorizon / (hoursPerDay / 2), 0.5));
  return up ? height : -height;
}

/**
 * How dark a scene is at an hour, from 0 in daylight towards 1 on a moonless night. The light fades through the late
 * afternoon and twilight by the height of the sun, and comes back the same way before sunrise.
 * @param {number} hour             Decimal hours since midnight.
 * @param {number} [sunrise=6]      Sunrise, in hours.
 * @param {number} [sunset=18]      Sunset, in hours.
 * @param {number} [hoursPerDay=24]
 * @param {number} [moonlight=0]    How much moonlight there is, from {@link moonlight}.
 * @returns {number}
 */
export function darkness(hour, sunrise = 6, sunset = 18, hoursPerDay = 24, moonlight = 0) {
  const dark = byHeight(DARKNESS_BY_SUN_HEIGHT, sunHeight(hour, sunrise, sunset, hoursPerDay));
  return round(dark * (1 - (MOONLIGHT * moonlight)));
}

/**
 * How golden the light is with the sun at each height, in degrees, from 0 to 1: none until the sun is low, warmest
 * with it on the horizon, and gone once twilight deepens into night.
 * @type {[number, number][]}
 */
export const GOLDEN_BY_SUN_HEIGHT = [[16, 0], [6, 0.7], [0, 1], [-6, 0.6], [-12, 0]];

/** How strongly the golden light tints a scene at its warmest, as a scene's ambience intensity. */
export const GOLDEN_INTENSITY = 0.6;

/** The golden light's hue at dawn, a paler gold, and at dusk, a deeper amber, as fractions of the colour wheel. */
export const DAWN_HUE = 0.1;
export const DUSK_HUE = 0.06;

/**
 * The warm light of dawn and dusk at an hour: a hue, gold in the morning and amber in the evening, and how strongly it
 * tints the scene, by the height of the sun, so it comes and goes with the darkness.
 * @param {number} hour             Decimal hours since midnight.
 * @param {number} [sunrise=6]      Sunrise, in hours.
 * @param {number} [sunset=18]      Sunset, in hours.
 * @param {number} [hoursPerDay=24]
 * @returns {{hue: number, intensity: number}}
 */
export function goldenLight(hour, sunrise = 6, sunset = 18, hoursPerDay = 24) {
  const weight = byHeight(GOLDEN_BY_SUN_HEIGHT, sunHeight(hour, sunrise, sunset, hoursPerDay));
  // Morning runs from the middle of the night to the middle of the day.
  const day = wrap(sunset - sunrise, hoursPerDay);
  const sinceSunrise = wrap(hour - sunrise, hoursPerDay);
  const morning = (sinceSunrise <= day / 2) || (sinceSunrise > day + ((hoursPerDay - day) / 2));
  return { hue: morning ? DAWN_HUE : DUSK_HUE, intensity: round(weight * GOLDEN_INTENSITY) };
}

/**
 * Read a value off a table by the height of the sun, between the heights it lists from highest to lowest. Above the
 * first it is the first's value, and below the last the last's.
 * @param {[number, number][]} points  Heights in degrees, and the value at each.
 * @param {number} height
 * @returns {number}
 */
function byHeight(points, height) {
  if ( height >= points[0][0] ) return points[0][1];
  for ( let i = 1; i < points.length; i++ ) {
    const [high, from] = points[i - 1];
    const [low, to] = points[i];
    if ( height < low ) continue;
    return from + ((to - from) * (high - height) / (high - low));
  }
  return points.at(-1)[1];
}

/**
 * How much moonlight there is, from 0 with no moon up to 1 with a full moon at the top of the sky: the brightest moon's
 * lit face, by how high it rides.
 * @param {number} fraction     Fraction of the day, from {@link dayFraction}.
 * @param {number[]} phases     The phase of each moon, from {@link moonPhase}.
 * @param {number} [rise=0.25]  Sunrise, as a fraction of the day.
 * @param {number} [set=0.75]   Sunset, as a fraction of the day.
 * @returns {number}
 */
export function moonlight(fraction, phases, rise = 0.25, set = 0.75) {
  let light = 0;
  for ( const phase of phases ) {
    const angle = moonSkyAngle(fraction, phase, rise, set);
    if ( aboveHorizon(angle) ) light = Math.max(light, illumination(phase) * Math.sin(angle));
  }
  return light;
}

/* -------------------------------------------- */
/*  Seasons                                     */
/* -------------------------------------------- */

/**
 * The days of the year each season covers, as a start day and an end day (both counted from 0, the end exclusive).
 * A season that runs over the new year, such as winter, has an end before its start. Seasons are matched on days or
 * on months as Foundry's own calendar does; a season with neither is left out.
 * @param {object} calendar
 * @returns {{index: number, name: string, start: number, end: number}[]}
 */
export function seasonRanges(calendar) {
  const months = calendar.months?.values ?? [];
  const monthStarts = [];
  let total = 0;
  for ( const month of months ) {
    monthStarts.push(total);
    total += month.days;
  }
  const year = calendar.days.daysPerYear;
  const startOfMonth = ordinal => {
    const index = months.findIndex(m => m.ordinal === ordinal);
    return index < 0 ? null : monthStarts[index];
  };

  const ranges = [];
  for ( const [index, season] of (calendar.seasons?.values ?? []).entries() ) {
    const { dayStart, dayEnd, monthStart, monthEnd } = season;
    let start;
    let end;
    if ( Number.isFinite(dayStart) && Number.isFinite(dayEnd) ) {
      start = dayStart - 1;
      end = dayEnd;
    } else if ( Number.isFinite(monthStart) && Number.isFinite(monthEnd) ) {
      start = startOfMonth(monthStart);
      const last = months.findIndex(m => m.ordinal === monthEnd);
      end = last < 0 ? null : monthStarts[last] + months[last].days;
    }
    if ( !Number.isFinite(start) || !Number.isFinite(end) ) continue;
    ranges.push({ index, name: season.name, start: wrap(start, year), end: wrap(end, year) || year });
  }
  return ranges;
}

/** Colours for the season bar, chosen by the season's name. */
export const SEASON_COLORS = {
  spring: "#86c96e",
  summer: "#f3c04f",
  fall: "#e2793b",
  winter: "#8ec8ea"
};

/** Colours for seasons whose names don't say which they are, in turn. */
const FALLBACK_COLORS = ["#86c96e", "#f3c04f", "#e2793b", "#8ec8ea", "#c58ee0", "#e88fae"];

/**
 * The kind of season a name describes, read from words such as "Spring" or "Autumn" in it. Localization keys are
 * read too: "DND5E.CALENDAR.Harptos.Season.Fall" is a fall.
 * @param {string} name
 * @returns {"spring"|"summer"|"fall"|"winter"|null}
 */
export function seasonKind(name = "") {
  const n = String(name).toLowerCase();
  if ( /spring|seeding|planting/.test(n) ) return "spring";
  if ( /summer|blooming|steading/.test(n) ) return "summer";
  if ( /fall|autumn|harvest|gleaning|withering/.test(n) ) return "fall";
  if ( /winter|stilling/.test(n) ) return "winter";
  return null;
}

/**
 * The colour a season is drawn in on the bar.
 * @param {string} name
 * @param {number} index
 * @returns {string}
 */
export function seasonColor(name, index) {
  return SEASON_COLORS[seasonKind(name)] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/**
 * The season bar's background: one year, left to right, with each season's colour at its middle, blending into the
 * next. It is drawn to repeat, so stops before 0% and after 100% carry the blend over the new year.
 * @param {object} calendar
 * @returns {string}  A CSS linear-gradient.
 */
export function seasonGradient(calendar) {
  const year = calendar.days.daysPerYear;
  const ranges = seasonRanges(calendar);
  if ( !ranges.length ) return "linear-gradient(90deg, #8ea7c8, #c8b78e, #8ea7c8)";
  const stops = ranges.map(({ index, name, start, end }) => {
    const length = end > start ? end - start : (end + year) - start;
    return { at: wrap(start + (length / 2), year) / year, color: seasonColor(name, index) };
  }).sort((a, b) => a.at - b.at);
  const all = [
    { ...stops.at(-1), at: stops.at(-1).at - 1 },
    ...stops,
    { ...stops[0], at: stops[0].at + 1 }
  ];
  return `linear-gradient(90deg, ${all.map(s => `${s.color} ${round(s.at * 100)}%`).join(", ")})`;
}

/* -------------------------------------------- */
/*  Daylight                                    */
/* -------------------------------------------- */

/**
 * How far the length of the day swings either side of half a day through the year, as a fraction of a whole day:
 * sixteen hours of daylight at midsummer and eight at midwinter, in a 24-hour day.
 */
export const DAYLIGHT_SWING = 1 / 6;

/**
 * The day of the year with the most daylight, counted from 0: halfway from the start of spring to the start of
 * autumn, so the solstice when the seasons start at the equinoxes. Failing that, the start of summer, or half a
 * year from the start of winter.
 * @param {object} calendar
 * @returns {number|null}  Null when the calendar's seasons don't say.
 */
export function midsummer(calendar) {
  const year = calendar.days.daysPerYear;
  const ranges = seasonRanges(calendar);
  const start = kind => ranges.find(r => seasonKind(r.name) === kind)?.start ?? null;
  const spring = start("spring");
  const fall = start("fall");
  if ( (spring !== null) && (fall !== null) ) return wrap(spring + (wrap(fall - spring, year) / 2), year);
  const summer = start("summer");
  if ( summer !== null ) return summer;
  const winter = start("winter");
  return winter === null ? null : wrap(winter + (year / 2), year);
}

/**
 * Sunrise and sunset on a day, with long days in summer and short ones in winter, either side of noon. A calendar
 * whose seasons don't say when summer is has sunrise and sunset a quarter of the day either side of noon all year.
 * @param {object} calendar
 * @param {{day: number, leapYear?: boolean}} components  The day's time components.
 * @param {number} [midsummerDay]  The day of the year with the most daylight, if already worked out.
 * @returns {{sunrise: number, sunset: number}}  In hours.
 */
export function daylight(calendar, components, midsummerDay = midsummer(calendar)) {
  const { hoursPerDay, daysPerYear, daysPerLeapYear } = calendar.days;
  const noon = hoursPerDay / 2;
  let length = noon;
  if ( midsummerDay !== null ) {
    const days = components.leapYear ? (daysPerLeapYear ?? daysPerYear) : daysPerYear;
    length += DAYLIGHT_SWING * hoursPerDay * Math.cos(TAU * (components.day - midsummerDay) / days);
  }
  return { sunrise: round(noon - (length / 2)), sunset: round(noon + (length / 2)) };
}

/** How long dawn's and dusk's glow lasts either side of the night, in hours, as {@link dayPhase} counts them. */
export const TWILIGHT_HOURS = 1;

/** How strong the dawn and dusk glow is at sunrise and sunset, where it is strongest. */
export const TWILIGHT_GLOW = 0.55;

/**
 * The SVG paths that blend day into night on the day wheel, across the hour either side of sunrise and sunset. The
 * day face is drawn whole only from an hour after sunrise to an hour before sunset; either side of that, its colour
 * fades smoothly out into the night, and over the blend a twilight glow swells to its strongest at sunrise and sunset
 * and fades away either side. Each fade is built from wedges stacked one over another, each a little wider than the
 * last and faint enough that together they make the fade, so no two wedges meet edge to edge and leave a seam.
 * @param {number} sunrise   In hours.
 * @param {number} sunset    In hours.
 * @param {number} hoursPerDay
 * @param {number} r
 * @param {number} [steps=24]  How many wedges each fade is built from.
 * @returns {{core: string, day: {d: string, opacity: number}[], glow: {d: string, opacity: number}[]}}
 */
export function twilightPaths(sunrise, sunset, hoursPerDay, r, steps = 24) {
  const dayLength = wrap(sunset - sunrise, hoursPerDay);
  // On a short night, or a short day, the blends meet in the middle rather than overlap.
  const blend = Math.min(TWILIGHT_HOURS, dayLength / 2, (hoursPerDay - dayLength) / 2);
  const wedge = (from, to) => {
    const large = wrap(to - from, hoursPerDay) / hoursPerDay > 0.5 ? 1 : 0;
    return `M0,0 L${wheelPoint(to, hoursPerDay, r)} A${r} ${r} 0 ${large} 1 ${wheelPoint(from, hoursPerDay, r)} Z`;
  };
  const core = dayLength - (2 * blend) > 0 ? wedge(sunrise + blend, sunset - blend) : "";
  if ( blend <= 0 ) return { core, day: [], glow: [] };

  const smooth = t => t * t * (3 - (2 * t));
  // The opacity of each stacked layer, narrowest first, so that the band `j` steps out, covered by layer `j` and
  // every wider one, shows `target` at its middle, `t` running from 0 at the inside of the fade to 1 at its end.
  const layers = target => {
    const shown = Array.from({ length: steps }, (_, j) => target((j + 0.5) / steps));
    return shown.map((a, j) => round3(1 - ((1 - a) / (1 - (shown[j + 1] ?? 0)))));
  };

  // The day's colour, whole beside the core and gone at the far side of the blend, reaching out from the core.
  const dayOpacity = layers(t => 1 - smooth(t));
  const day = [];
  dayOpacity.forEach((opacity, k) => {
    const reach = 2 * blend * (k + 1) / steps;
    day.push({ d: wedge(sunrise + blend - reach, sunrise + blend), opacity });
    day.push({ d: wedge(sunset - blend, sunset - blend + reach), opacity });
  });

  // The glow, strongest at sunrise and sunset and fading out either side, centred on each.
  const glowOpacity = layers(t => TWILIGHT_GLOW * (1 - smooth(t)));
  const glow = [];
  glowOpacity.forEach((opacity, k) => {
    const reach = blend * (k + 1) / steps;
    glow.push({ d: wedge(sunrise - reach, sunrise + reach), opacity });
    glow.push({ d: wedge(sunset - reach, sunset + reach), opacity });
  });
  return { core, day, glow };
}

/**
 * The point on the day wheel's rim, about its own centre and before it turns, that is at the bottom at an hour.
 * @param {number} hour
 * @param {number} hoursPerDay
 * @param {number} r
 * @returns {string}  As `x,y`.
 */
function wheelPoint(hour, hoursPerDay, r) {
  const a = (270 - (hour / hoursPerDay * 360)) * Math.PI / 180;
  return `${round(r * Math.cos(a))},${round(r * Math.sin(a))}`;
}

/**
 * How far through its year a moment is, from 0 at the first moment of the year towards 1.
 * @param {object} calendar
 * @param {{day: number, leapYear?: boolean}} components  The moment's time components.
 * @param {number} fraction                              Fraction of the day, from {@link dayFraction}.
 * @returns {number}
 */
export function yearFraction(calendar, components, fraction) {
  const { daysPerYear, daysPerLeapYear } = calendar.days;
  const days = components.leapYear ? (daysPerLeapYear ?? daysPerYear) : daysPerYear;
  return (components.day + fraction) / days;
}

/* -------------------------------------------- */
/*  Moons                                       */
/* -------------------------------------------- */

/**
 * @typedef MoonConfig
 * @property {string} id            A unique key for the moon.
 * @property {string} name          Its name, or a localization key for it.
 * @property {number} period        Days from one new moon to the next.
 * @property {string} color         The colour of its lit face.
 * @property {{year: number, day?: number, hour?: number}} epoch  A moment the phase is known at: a year as the
 *                                  calendar shows it, a day of that year counted from 0, and an hour of that day
 *                                  (which may be negative, or more than a day's hours, to land between days).
 * @property {number} [epochPhase=0]  The phase at the epoch: 0 new, 0.5 full.
 * @property {"tears"} [trail]      A trail drawn following it across the sky: "tears" for the Tears of Selûne.
 */

/** The eight phases, in order from new, each centred on its own eighth of the cycle. */
export const PHASES = [
  "New", "WaxingCrescent", "FirstQuarter", "WaxingGibbous", "Full", "WaningGibbous", "LastQuarter", "WaningCrescent"
];

/**
 * The world time of a moon's epoch.
 * @param {object} calendar
 * @param {MoonConfig} moon
 * @returns {number}
 */
export function epochTime(calendar, moon) {
  const { year, day = 0, hour = 0 } = moon.epoch;
  const midnight = calendar.componentsToTime({ year: year - (calendar.years?.yearZero ?? 0), day });
  return midnight + (hour * calendar.days.minutesPerHour * calendar.days.secondsPerMinute);
}

/**
 * A moon's phase: how far through its cycle it is, from 0 at new moon, through 0.5 at full, towards 1.
 * @param {object} calendar
 * @param {MoonConfig} moon
 * @param {number} time      World time in seconds.
 * @param {number} [epoch]   The moon's epoch as a world time, if already worked out.
 * @returns {number}
 */
export function moonPhase(calendar, moon, time, epoch = epochTime(calendar, moon)) {
  const days = (time - epoch) / secondsPerDay(calendar);
  return wrap((moon.epochPhase ?? 0) + (days / moon.period), 1);
}

/**
 * The name of a phase, from {@link PHASES}.
 * @param {number} phase
 * @returns {string}
 */
export function phaseName(phase) {
  return PHASES[Math.round(wrap(phase, 1) * 8) % 8];
}

/**
 * The moons that are full or new on a day: those whose phase passes full (0.5) or new (0) between the day's
 * midnight and the next.
 * @param {object} calendar
 * @param {MoonConfig[]} moons
 * @param {number} midnight  World time of the day's start.
 * @returns {{full: MoonConfig[], new: MoonConfig[]}}
 */
export function moonEvents(calendar, moons, midnight) {
  const events = { full: [], new: [] };
  for ( const moon of moons ) {
    const phase = moonPhase(calendar, moon, midnight);
    // A day runs from its midnight up to, but not including, the next; the margin keeps a phase that falls on the
    // stroke of midnight on the day it starts.
    const step = (1 / moon.period) - 1e-9;
    if ( wrap(0.5 - phase, 1) < step ) events.full.push(moon);
    if ( wrap(-phase, 1) < step ) events.new.push(moon);
  }
  return events;
}

/**
 * The world time of a moon's next full moon after a world time.
 * @param {object} calendar
 * @param {MoonConfig} moon
 * @param {number} time      World time in seconds.
 * @param {number} [epoch]   The moon's epoch as a world time, if already worked out.
 * @returns {number}
 */
export function nextFullMoon(calendar, moon, time, epoch = epochTime(calendar, moon)) {
  const days = wrap(0.5 - moonPhase(calendar, moon, time, epoch), 1) * moon.period;
  return time + Math.round(days * secondsPerDay(calendar));
}

/**
 * How much of a moon's face is lit, from 0 at new to 1 at full.
 * @param {number} phase
 * @returns {number}
 */
export function illumination(phase) {
  return (1 - Math.cos(phase * TAU)) / 2;
}

/**
 * A moon's angle across the sky bowl, measured as {@link sunSkyAngle}. A moon trails the sun by its phase: new moons
 * keep company with the sun, and full moons rise at sunset and ride highest in the middle of the night.
 * @param {number} fraction     Fraction of the day, from {@link dayFraction}.
 * @param {number} phase        The moon's phase, from {@link moonPhase}.
 * @param {number} [rise=0.25]  Sunrise, as a fraction of the day.
 * @param {number} [set=0.75]   Sunset, as a fraction of the day.
 * @returns {number}
 */
export function moonSkyAngle(fraction, phase, rise = 0.25, set = 0.75) {
  return wrap(sunSkyAngle(fraction, rise, set) - (phase * TAU), TAU);
}

/* -------------------------------------------- */
/*  Suns                                        */
/* -------------------------------------------- */

/**
 * @typedef SunConfig
 * @property {string} id            A unique key for the sun.
 * @property {string} name          Its name, or a localization key for it.
 * @property {string} color         The colour of its face, high in the sky.
 * @property {number} [size=1]      Its size, against the usual sun's.
 * @property {number} [offset=0]    Hours it trails the day's sunrise and sunset by, for a second sun that rises
 *                                  later; negative to lead.
 */

/** The colour a sun reddens to as it nears the horizon. */
export const SUN_LOW_COLOR = "#ff6a3d";

/**
 * A sun's angle across the sky bowl, measured as {@link sunSkyAngle}, for a sun that may trail the day's own.
 * @param {number} fraction     Fraction of the day, from {@link dayFraction}.
 * @param {SunConfig} sun
 * @param {number} hoursPerDay
 * @param {number} [rise=0.25]  Sunrise, as a fraction of the day.
 * @param {number} [set=0.75]   Sunset, as a fraction of the day.
 * @returns {number}
 */
export function sunAngle(fraction, sun, hoursPerDay, rise = 0.25, set = 0.75) {
  return sunSkyAngle(wrap(fraction - ((sun.offset ?? 0) / hoursPerDay), 1), rise, set);
}

/**
 * The colour of a sun's face at a sky angle: its own colour high in the sky, reddening towards the horizon.
 * @param {string} color  The sun's colour, as `#rrggbb`.
 * @param {number} angle  Its sky angle.
 * @returns {string}      As `#rrggbb`.
 */
export function sunColor(color, angle) {
  const low = (1 - Math.max(0, Math.sin(angle))) ** 2;
  return mixColor(color, SUN_LOW_COLOR, low);
}

/**
 * A colour between two others.
 * @param {string} a  As `#rrggbb`.
 * @param {string} b  As `#rrggbb`.
 * @param {number} t  How far towards `b`, from 0 to 1.
 * @returns {string}  As `#rrggbb`.
 */
export function mixColor(a, b, t) {
  const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [from, to] = [channels(a), channels(b)];
  return `#${from.map((c, i) => Math.round(c + ((to[i] - c) * t)).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Whether a body at this sky angle is above the horizon, and so drawn in the bowl.
 * @param {number} angle
 * @returns {boolean}
 */
export function aboveHorizon(angle) {
  return (angle > 0) && (angle < Math.PI);
}

/**
 * The point at a sky angle on a circle about the bowl's centre.
 * @param {number} angle
 * @param {{x: number, y: number, r: number}} orbit
 * @returns {{x: number, y: number}}
 */
export function orbitPoint(angle, { x, y, r }) {
  return { x: round(x + (r * Math.cos(angle))), y: round(y + (r * Math.sin(angle))) };
}

/**
 * The Tears of Selûne, the glittering shards that follow her: for each glint, how far it trails behind her along her
 * path, in radians; how far it strays off her path, outwards, in pixels; and its radius. They start clear of her face
 * and thin out as they trail away.
 * @type {ReadonlyArray<{behind: number, out: number, r: number}>}
 */
export const TEARS = Object.freeze([
  { behind: 0.16, out: -3, r: 1.4 },
  { behind: 0.2, out: 3, r: 1.1 },
  { behind: 0.24, out: -1, r: 1.2 },
  { behind: 0.29, out: 4, r: 0.9 },
  { behind: 0.33, out: -4, r: 1 },
  { behind: 0.38, out: 1, r: 0.8 },
  { behind: 0.43, out: -2, r: 0.7 },
  { behind: 0.49, out: 3, r: 0.6 }
]);

/**
 * Where a glint of a moon's trail is, from where the moon is. A moon's sky angle grows through the day, so its trail
 * lies at smaller angles.
 * @param {number} angle  The moon's sky angle, from {@link moonSkyAngle}.
 * @param {{behind: number, out: number}} glint  One of {@link TEARS}.
 * @param {{x: number, y: number, r: number}} orbit  The moons' orbit.
 * @returns {{x: number, y: number, angle: number}}
 */
export function trailPoint(angle, glint, orbit) {
  const at = wrap(angle - glint.behind, TAU);
  return { ...orbitPoint(at, { ...orbit, r: orbit.r + glint.out }), angle: at };
}

/**
 * The SVG path of a moon's lit face, for a moon of radius `r` centred at (r, r). A waxing moon is lit from the
 * right, a waning moon from the left; the terminator between light and dark is half an ellipse.
 * @param {number} phase
 * @param {number} r
 * @returns {string}  An empty string at new moon.
 */
export function moonPath(phase, r) {
  const p = wrap(phase, 1);
  const k = Math.cos(p * TAU); // 1 at new moon, -1 at full.
  if ( k > 0.999 ) return "";
  const rx = round(Math.abs(k) * r);
  const top = `${r} 0`;
  const bottom = `${r} ${2 * r}`;
  const waxing = p < 0.5;
  // The lit limb runs down the right-hand side when waxing, the left-hand side when waning. The terminator comes back
  // up, bulging towards the lit limb while less than half is lit (a crescent) and away from it once more is (gibbous).
  const limbSweep = waxing ? 1 : 0;
  const crescent = k > 0;
  const terminatorSweep = waxing === crescent ? 0 : 1;
  return `M${top} A${r} ${r} 0 0 ${limbSweep} ${bottom} A${rx} ${r} 0 0 ${terminatorSweep} ${top}Z`;
}

/**
 * Round to two decimal places, so the numbers written into the page stay short.
 * @param {number} n
 * @returns {number}
 */
function round(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Round to three decimal places, for opacities, which fine fades need finer than {@link round}.
 * @param {number} n
 * @returns {number}
 */
function round3(n) {
  return Math.round(n * 1000) / 1000;
}
