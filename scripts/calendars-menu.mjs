import { CALENDARS, chosenCalendars } from "./calendars.mjs";
import { MODULE_ID } from "./constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The Additional Calendars menu: a tick box for each calendar the module can add to D&D 5e's. Ticked calendars become
 * choices in D&D 5e's Configure Calendar once the world reloads. The world's own calendar can't be unticked, as the
 * world would lose it.
 */
export class CalendarsMenu extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "sdl-calendars-menu",
    tag: "form",
    window: {
      title: "SDL.Calendars.Title",
      icon: "fa-solid fa-calendar-plus",
      contentClasses: ["standard-form"]
    },
    position: { width: 480 },
    form: {
      handler: CalendarsMenu.#onSubmit,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    calendars: {
      template: `modules/${MODULE_ID}/templates/calendars-menu.hbs`
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const chosen = chosenCalendars();
    const inUse = game.settings.get("dnd5e", "calendar");
    context.calendars = Object.entries(CALENDARS).map(([key, { label, hint }]) => ({
      key,
      label: _loc(label),
      hint: _loc(hint),
      checked: chosen.includes(key) || (key === inUse),
      inUse: key === inUse
    }));
    context.buttons = [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" }];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Save the ticked calendars, and offer to reload the world if they changed.
   * @this {CalendarsMenu}
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmit(event, form, formData) {
    const inUse = game.settings.get("dnd5e", "calendar");
    const ticked = formData.object;
    const calendars = Object.fromEntries(Object.keys(CALENDARS).map(key => [key, !!ticked[key] || (key === inUse)]));
    const before = chosenCalendars();
    await game.settings.set(MODULE_ID, "calendars", calendars);
    const after = chosenCalendars();
    const changed = (before.length !== after.length) || before.some(key => !after.includes(key));
    if ( changed ) await foundry.applications.settings.SettingsConfig.reloadConfirm({ world: true });
  }
}
