'use strict';

import Confirmation from './intent-parser/confirmation';
import chrono from './intent-parser/chrono';

/*
Examples of supported phrases:
Remind me to pick Sasha from Santa Clara University at 5PM today.
Remind me that it is picnic day on July 4th.
Remind us to go to the opera at 7:15pm on 2nd February.
Remind us to go at my mum's at 11:30am on 31st July.
Remind everybody to pack their stuff by next Friday 5pm.
Remind me that every Tuesday night is trash day.

To add:
Remind me every Tuesday to take the bin out.
Remind Guillaume on Thursdays evening to go to his drawing class.
Remind me that I should prepare my appointment tomorrow morning.
*/

/*
 * @todo:
 *   * Use CLDR to:
 *     * Generate placeholders.users
 *     * Generate placeholders.listBreaker
 *     * Generate placeholders.punctuation
 */

const p = Object.freeze({
  // Properties
  confirmation: Symbol('confirmation'),
  patterns: Symbol('patterns'),

  // Methods
  parseUsers: Symbol('parseUsers'),
  parseAction: Symbol('parseAction'),
  parseDatetime: Symbol('parseDatetime'),
  normalise: Symbol('normalise'),
  init: Symbol('init'),
  buildPatterns: Symbol('buildPatterns'),
  splitOnPlaceholders: Symbol('splitOnPlaceholders'),
  escape: Symbol('escape'),
});

const PATTERNS = {
  en: {
    patterns: [
      `Remind [users] to [action] at [time].`,
      `Remind [users] to [action] on [time].`,
      `Remind [users] to [action] by [time].`,
      `Remind [users] at [time] to [action].`,
      `Remind [users] on [time] to [action].`,
      `Remind [users] by [time] to [action].`,
      `Remind [users] to [action].`,
      `Remind [users] that it is [action] on [time].`,
      `Remind [users] that it is [action] at [time].`,
      `Remind [users] that it is [action] by [time].`,
      `Remind [users] that it is [action].`,
      `Remind [users] that [action] at [time].`,
      `Remind [users] that [action] on [time].`,
      `Remind [users] that [action] by [time].`,
      `Remind [users] that [action].`,
      `Remind [users] that [time] is [action].`,
      `Remind [users] about [action] on [time].`,
      `Remind [users] about [action] at [time].`,
      `Remind [users] about [action] by [time].`,
      `Remind [users] about [action].`,
    ],
    placeholders: {
      users: '( \\S+ | \\S+,? and \\S+ )',
      action: '(.+)',
      time: '(.+)',
    },
    // @see http://www.unicode.org/cldr/charts/29/summary/en.html#4
    punctuation: new RegExp(
      `[-‐–—,;:!?.…'‘’"“”()\\[\\]§@*/&#†‡′″]+$`, 'u'),
    // @see http://www.unicode.org/cldr/charts/29/summary/en.html#6402
    listBreaker: new RegExp(`,|, and\\b|\\band\\b`, 'gu'),
  },
  fr: {
    patterns: [
      `Rappelle [users] de [action] [time].`,
      `Rappelle [users] d'[action] [time].`,
      `Rappelle-[users] de [action] [time].`,
      `Rappelle-[users] d'[action] [time].`,
    ],
    placeholders: {
      users: '( \\S+ | \\S+ et \\S+ )',
      action: '(.+)',
      time: '(.+)',
    },
    punctuation: new RegExp(
      `[-‐–—,;:!?.…’"“”«»()\\[\\]§@*/&#†‡]+$`, 'u'),
    listBreaker: new RegExp(`,|\\bet\\b`, 'gu'),
  },
  ja: {
    patterns: [
      `[time][action]を[users]に思い出させて。`,
      `[time][users]に[action]を思い出させて。`,
      `[time][users]は[action]と言うリマインダーを作成して。`,
    ],
    placeholders: {
      users: '(\\S+|\\S+、\\S+)',
      action: '(.+)',
      time: '(.+)',
    },
    punctuation: new RegExp(
      `[-‾_＿－‐—―〜・･,，、､;；:：!！?？.．‥…。｡＇‘’"＂“”(（)）\\[［\\]］{｛}｝` +
      `〈〉《》「｢」｣『』【】〔〕‖§¶@＠*＊/／\＼&＆#＃%％‰†‡′″〃※]+$`, 'u'),
    listBreaker: new RegExp(`、`, 'gu'),
  },
};

export default class IntentParser {
  constructor(locale = 'en') {
    this.locale = locale;
    this[p.confirmation] = new Confirmation(locale);
    this[p.patterns] = {};

    this[p.init]();

    window.intentParser = this;

    Object.seal(this);
  }

  parse(phrase = '') {
    if (!phrase) {
      return Promise.reject('Empty string.');
    }

    return new Promise((resolve, reject) => {
      phrase = this[p.normalise](phrase);
      const { due, processedPhrase } = this[p.parseDatetime](phrase);

      if (!due) {
        return reject('Time could not be parsed.');
      }

      const successful = this[p.patterns][this.locale].some((pattern) => {
        if (!pattern.regexp.test(processedPhrase)) {
          return false;
        }

        const segments = pattern.regexp.exec(processedPhrase);
        segments.shift();

        const recipients = this[p.parseUsers](
          segments[pattern.placeholders.users], phrase
        );
        const action = this[p.parseAction](
          segments[pattern.placeholders.action], phrase
        );

        // The original pattern matching the intent.
        const match = pattern.match;

        const confirmation = this[p.confirmation].getReminderMessage({
          recipients,
          action,
          due,
          match,
        });

        resolve({ recipients, action, due, confirmation });
        return true;
      });

      if (!successful) {
        return reject('Unsupported intent format.');
      }
    });
  }

  [p.parseUsers](string = '') {
    return string
      .split(PATTERNS[this.locale].listBreaker)
      .map((user) => user.trim());
  }

  [p.parseAction](string = '') {
    return string.trim();
  }

  [p.parseDatetime](phrase = '') {
    phrase = phrase.trim();

    const dates = chrono.parse(phrase);

    if (!dates.length) {
      return { time: null, processedPhrase: '' };
    }

    if (dates.length > 1) {
      console.error('More than 2 temporal components detected.');
    }

    const date = dates[0];
    const due = Number(date.start.date());

    const processedPhrase = phrase.substr(0, date.index) +
      phrase.substr(date.index + date.text.length);

    return { due, processedPhrase };
  }

  [p.normalise](string = '', locale = this.locale) {
    // Normalise whitespaces to space.
    return string
      .replace(/\s+/g, ' ')
      // The Web Speech API returns PM hours as `p.m.`.
      .replace(/([0-9]) p\.m\./gi, '$1 PM')
      .replace(/([0-9]) a\.m\./gi, '$1 AM')
      .trim()
      // Strip punctuations.
      .replace(PATTERNS[locale].punctuation, '');
  }

  /**
   * Build the `patterns` property as an object mapping locale code to list of
   * patterns.
   */
  [p.init]() {
    Object.keys(PATTERNS).forEach((locale) => {
      this[p.patterns][locale] = PATTERNS[locale].patterns.map((phrase) =>
        this[p.buildPatterns](locale, phrase, PATTERNS[locale].placeholders));
    });
  }

  [p.buildPatterns](locale = this.locale, match = '', placeholders) {
    const phrase = this[p.normalise](match, locale);
    const tokens = this[p.splitOnPlaceholders](phrase);
    const order = {};
    let placeholderIndex = 0;

    const pattern = tokens
      .map((token) => {
        if (token.startsWith('[')) {
          const placeholder = token
            .substr(1)
            // Strip trailing `]` if any.
            .replace(new RegExp('\\]$', 'u'), '');

          // The order of the placeholders can be different depending on the
          // pattern or language. When we parse a string, we need to match the
          // regexp captured masks to the placeholder given its position.
          order[placeholder] = placeholderIndex;
          placeholderIndex++;

          return placeholders[placeholder];
        }

        if (token === ' ') {
          return '\\b \\b';
        }

        // Leading and trailing spaces are changed to word boundary.
        return this[p.escape](token)
          .replace(new RegExp('^ ', 'u'), '\\b')
          .replace(new RegExp(' $', 'u'), '\\b');
      });

    const regexp = new RegExp(`^${pattern.join('')}$`, 'iu');

    return { regexp, placeholders: order, match };
  }

  /**
   * Split the input phrase along the placeholders noted into brackets:
   * `Meet [users] on [time].` => ['Meet ', '[users]', ' on ', '[time]', '.']
   *
   * @param {string} phrase
   * @return {Array.<string>}
   */
  [p.splitOnPlaceholders](phrase) {
    const tokens = [''];
    let index = 0;

    phrase.split('').forEach((c) => {
      if (c === '[' && tokens[index] !== '') {
        index++;
        tokens[index] = '';
      }

      tokens[index] += c;

      if (c === ']') {
        index++;
        tokens[index] = '';
      }
    });

    return tokens;
  }

  /**
   * Escape characters to be used inside a RegExp as static patterns.
   *
   * @param {string} string
   * @return {string}
   */
  [p.escape](string) {
    return string
      .replace(new RegExp('\\.', 'gu'), '\\.')
      .replace(new RegExp('\\/', 'gu'), '\\/')
      .replace(new RegExp('\\(', 'gu'), '\\(')
      .replace(new RegExp('\\)', 'gu'), '\\)');
  }
}
