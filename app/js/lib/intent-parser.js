'use strict';

import chrono from 'chrono-node';

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

const p = Object.freeze({
  // Properties
  regexps: Symbol('regexps'),

  // Methods
  parseUsers: Symbol('parseUsers'),
  parseAction: Symbol('parseAction'),
  parseDatetime: Symbol('parseDatetime'),
  normalise: Symbol('normalise'),
  init: Symbol('init'),
  buildRegExp: Symbol('buildRegExp'),
  splitOnPlaceholders: Symbol('splitOnPlaceholders'),
  escape: Symbol('escape'),
});

const PATTERNS = {
  en: {
    patterns: [
      `Remind [user] to [action] at [time].`,
      `Remind [user] to [action] on [time].`,
      `Remind [user] to [action] by [time].`,
      `Remind [user] at [time] to [action].`,
      `Remind [user] on [time] to [action].`,
      `Remind [user] by [time] to [action].`,
      `Remind [user] that it is [action] on [time].`,
      `Remind [user] that [time] is [action].`,
    ],
    placeholders: {
      user: '( \\S+ | \\S+,? and \\S+ )',
      action: '(.+)',
      time: '(.+)',
    },
    // @see http://www.unicode.org/cldr/charts/29/summary/en.html#4
    punctuation: new RegExp(
      `[-‐–—,;:!?.…'‘’"“”()\\[\\]§@*/&#†‡′″]+$`, 'u'),
  },
  fr: {
    patterns: [
      `Rappelle [user] de [action] [time].`,
      `Rappelle [user] d'[action] [time].`,
      `Rappelle-[user] de [action] [time].`,
      `Rappelle-[user] d'[action] [time].`,
    ],
    placeholders: {
      user: '( \\S+ | \\S+ et \\S+ )',
      action: '(.+)',
      time: '(.+)',
    },
    punctuation: new RegExp(
      `[-‐–—,;:!?.…’"“”«»()\\[\\]§@*/&#†‡]+$`, 'u'),
  },
  ja: {
    patterns: [
      `[time][action]を[user]に思い出させて。`,
      `[time][user]に[action]を思い出させて。`,
      `[time][user]は[action]と言うリマインダーを作成して。`,
    ],
    placeholders: {
      user: '(\\S+|\\S+と\\S+)',
      action: '(.+)',
      time: '(.+)',
    },
    punctuation: new RegExp(
      `[-‾_＿－‐—―〜・･,，、､;；:：!！?？.．‥…。｡＇‘’"＂“”(（)）\\[［\\]］{｛}｝` +
      `〈〉《》「｢」｣『』【】〔〕‖§¶@＠*＊/／\＼&＆#＃%％‰†‡′″〃※]+$`, 'u'),
  },
};

export default class IntentParser {
  constructor(locale = 'en') {
    this.locale = locale;
    this[p.regexps] = {};
    this[p.init]();

    Object.seal(this);
  }

  parse(phrase = '') {
    if (!phrase) {
      return Promise.reject('Empty string.');
    }

    return new Promise((resolve, reject) => {
      const successful = this[p.regexps][this.locale].some((pattern) => {
        if (!pattern.patterns.test(phrase)) {
          return false;
        }

        const segments = pattern.patterns.exec(phrase);
        segments.shift();

        const users = this[p.parseUsers](segments[pattern.placeholders.user]);
        const action =
          this[p.parseAction](segments[pattern.placeholders.action]);
        const time = this[p.parseDatetime](segments[pattern.placeholders.time]);

        if (time === null) {
          reject('Time could not be parsed.');
          return false; // Try next patterns.
        }

        resolve({ users, action, time });
        return true;
      });

      if (!successful) {
        return reject('Unsupported intent format.');
      }
    });
  }

  [p.parseUsers](string = '') {
    return [string.trim()];
  }

  [p.parseAction](string = '') {
    return string.trim();
  }

  [p.parseDatetime](string = '') {
    string = string.trim();
    const datetime = chrono.parseDate(string);

    return datetime;
  }

  [p.normalise](string = '', locale = this.locale) {
    // Normalise whitespaces to space.
    return string
      .replace(/\s+/g, ' ')
      .trim()
      // Strip punctuations.
      .replace(PATTERNS[locale].punctuation, '');
  }

  /**
   * Build the `regexps` property as an object mapping locale code to list of
   * patterns and placeholders pairs.
   */
  [p.init]() {
    Object.keys(PATTERNS).forEach((locale) => {
      this[p.regexps][locale] = PATTERNS[locale].patterns.map((phrase) =>
        this[p.buildRegExp](locale, phrase, PATTERNS[locale].placeholders));
    });
  }

  [p.buildRegExp](locale = 'en', phrase = '', placeholders) {
    phrase = this[p.normalise](phrase, locale);

    const tokens = this[p.splitOnPlaceholders](phrase);
    const order = {};
    let placeholderIndex = 0;
    let patterns = tokens.map((token) => {
      if (token.startsWith('[')) {
        const placeholder = token
          .substr(1)
          // Strip trailing `]`.
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

    patterns = new RegExp(`^${patterns.join('')}$`, 'iu');

    return { patterns, placeholders: order };
  }

  /**
   * Split the input phrase along the placeholders noted into brackets.
   * e.g. 'Meet [user] on [time].' => ['Meet ', '[user]', ' on ', '[time]', '.']
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
