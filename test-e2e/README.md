# End-to-end tests

These tests run Sundial Calendar in a real Foundry, with one browser joined as the GM and another as a player.
They set the world time, click the real buttons on the calendar, and check what each user sees.

The harness is not shipped: the release archive in `.github/workflows/main.yml` lists its contents.

## Setting up

1. Copy `config.example.mjs` to `config.mjs` and set the paths. `FOUNDRY_ROOT` is Foundry's Node build, the
   folder holding `main.mjs`.
2. Link the repo into Foundry's modules folder, so the tests run the working copy. A directory junction needs
   no administrator rights. From a Command Prompt:

   ```
   mklink /J "%LOCALAPPDATA%\FoundryVTT\Data\modules\sogrom-sundial-calendar" "H:\Code\FoundryModules\Sundial-Calendar"
   ```

3. `npm install`, then `npx playwright install chromium` if Playwright has no browser yet.

Close any Foundry you have running first: only one Foundry can use the data folder at a time.

## Running

```
npm run test:e2e                 # every test
npm run test:e2e -- moon         # only tests whose name contains "moon"
HEADED=1 npm run test:e2e        # watch the browsers
npm run docs:screenshots         # retake the screenshots in docs/screenshots
```

Foundry is started on port 30099 with the `sdl-e2e` world, which is created on the first run. Every run deletes
the world's actors and scenes, then creates:

- **Player**, a player user, with **Aria** as their character;
- **The Yawning Portal**, the active scene.

The world's calendar is set to the Calendar of Harptos in D&D 5e's settings and turned on, and each test starts
with it open and not animating. Tests of other calendars pick them the same way, reload,
and put Harptos back.

The browsers run without the canvas, as nothing tested draws on it. `SDL_CANVAS=1` turns it on; the screenshot
script uses it so the calendar hangs over a scene.

A failed test saves a screenshot from each browser as `fail-NN-gm.png` and `fail-NN-player.png`, and prints the
end of both consoles.

## What is tested

- The calendar and its moons are the ones the GM picked in D&D 5e's settings.
- The offer to turn the calendar on, made to the GM once.
- Where the calendar sits, and that it replaces D&D 5e's own.
- The bar's day and time, the band's date, and that both follow D&D 5e's calendar preferences.
- The wheel's turn through the day, the part-of-day icon, the season and festival icons, and the season band.
- Selûne's place and phase, and Greyhawk's two moons and festival.
- Who gets which buttons; rewind and advance and their drop-downs; Set Date; buttons other modules add.
- Hiding and showing the sky, remembered across a reload.
- A change of time playing out.
- Hiding the calendar with D&D 5e's preference.
