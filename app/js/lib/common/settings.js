'use strict';

import EventDispatcher from '../common/event-dispatcher';

// Prefix all entries to avoid collisions.
const PREFIX = 'cue-';

const ORIGIN = 'https://calendar.knilxof.org';

/**
 * API version to use (currently not configurable).
 * @type {number}
 * @const
 */
const API_VERSION = 1;

/**
 * Regex to match upper case literals.
 * @type {RegExp}
 * @const
 */
const UPPER_CASE_REGEX = /([A-Z])/g;

const p = Object.freeze({
  values: Symbol('values'),
  storage: Symbol('storage'),

  // Private methods.
  updateSetting: Symbol('updateSetting'),
  stringToSettingTypedValue: Symbol('stringToSettingTypedValue'),
  getDefaultSettingValue: Symbol('getDefaultSettingValue'),
  onStorage: Symbol('onStorage'),
});

// Definition of all available settings and their default values (if needed).
const settings = Object.freeze({
  // String settings.
  SESSION: Object.freeze({ key: 'session' }),
  VOICED: Object.freeze({ key: 'voiced', type: 'boolean' }),
});

export default class Settings extends EventDispatcher {
  constructor(storage = localStorage) {
    super();

    // Not all browsers have localStorage supported or activated.
    this[p.storage] = storage || {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };

    this[p.values] = new Map();

    Object.keys(settings).forEach((settingName) => {
      const setting = settings[settingName];
      const settingStringValue = this[p.storage].getItem(
        `${PREFIX}${setting.key}`
      );

      // Setting values directly to avoid firing events on startup.
      this[p.values].set(
        setting,
        this[p.stringToSettingTypedValue](setting, settingStringValue)
      );
    });

    window.addEventListener('storage', this[p.onStorage].bind(this));

    Object.seal(this);
  }

  get session() {
    return this[p.values].get(settings.SESSION);
  }

  set session(value) {
    this[p.updateSetting](settings.SESSION, value);
  }

  get voiced() {
    return this[p.values].get(settings.VOICED);
  }

  set voiced(value) {
    this[p.updateSetting](settings.VOICED, value);
  }

  // Getters only.
  get origin() {
    return ORIGIN;
  }

  get apiVersion() {
    return API_VERSION;
  }

  /**
   * Iterates through all known settings and sets default value for all of them.
   *
   * @return {Promise}
   */
  clear() {
    return new Promise((resolve) => {
      Object.keys(settings).forEach((settingName) => {
        const setting = settings[settingName];
        this[p.updateSetting](setting, this[p.getDefaultSettingValue](setting));
      });
      resolve();
    });
  }

  /**
   * Tries to update setting with new value. If value has changed corresponding
   * event will be emitted. New value is also persisted to the local storage.
   *
   * @param {Object} setting Setting description object.
   * @param {number|boolean|string?} newValue New value for specified setting.
   * @private
   */
  [p.updateSetting](setting, newValue) {
    const currentValue = this[p.values].get(setting);
    if (currentValue === newValue) {
      return;
    }

    this[p.values].set(setting, newValue);

    if (newValue !== this[p.getDefaultSettingValue](setting)) {
      this[p.storage].setItem(`${PREFIX}${setting.key}`, newValue);
    } else {
      this[p.storage].removeItem(`${PREFIX}${setting.key}`);
    }

    this.emit(
      setting.key.replace(UPPER_CASE_REGEX, (part) => `-${part.toLowerCase()}`),
      newValue
    );
  }

  /**
   * Converts setting raw string value to the typed one depending on the setting
   * type.
   *
   * @param {Object} setting Setting description object.
   * @param {string?} stringValue Raw string setting value or null.
   * @return {number|boolean|string|null}
   * @private
   */
  [p.stringToSettingTypedValue](setting, stringValue) {
    // If string is null, we should return default value for this setting or
    // default value for setting type.
    if (stringValue === null) {
      return this[p.getDefaultSettingValue](setting);
    } else if (setting.type === 'boolean') {
      return stringValue === 'true';
    } else if (setting.type === 'number') {
      return Number(stringValue);
    }

    return stringValue;
  }

  /**
   * Gets default typed value for the specified setting.
   *
   * @param {Object} setting Setting description object.
   * @return {number|boolean|string|null}
   * @private
   */
  [p.getDefaultSettingValue](setting) {
    if (setting.defaultValue !== undefined) {
      return setting.defaultValue;
    }

    // Default value for this setting is not specified, let's return default
    // value for setting type (boolean, number or string).
    if (setting.type === 'boolean') {
      return false;
    } else if (setting.type === 'number') {
      return 0;
    }

    return null;
  }

  /**
   * Handles localStorage "storage" event.
   *
   * @param {StorageEvent} evt StorageEvent instance.
   * @private
   */
  [p.onStorage](evt) {
    if (!evt.key.startsWith(PREFIX)) {
      return;
    }

    const key = evt.key.substring(PREFIX.length);
    const settingName = Object.keys(settings).find((settingName) => {
      return settings[settingName].key === key;
    });

    if (!settingName) {
      console.warn(
        `Changed unknown storage entry with app specific prefix: ${evt.key}`
      );
      return;
    }

    const setting = settings[settingName];

    this[p.updateSetting](
      setting,
      this[p.stringToSettingTypedValue](setting, evt.newValue)
    );
  }
}
