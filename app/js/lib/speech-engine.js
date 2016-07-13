'use strict';

import EventDispatcher from './common/event-dispatcher';
import { SpeechSynthesisError } from './common/errors';

const p = Object.freeze({
  voices: Symbol('voices'),
  currentVoice: Symbol('currentVoice'),
  currentLang: Symbol('currentLang'),
});

export default class SpeechEngine extends EventDispatcher {
  constructor() {
    super([]);

    this[p.voices] = null;
    this[p.currentLang] = null;
    this[p.currentVoice] = null;
  }

  start() {
    if (!window.speechSynthesis) {
      return Promise.reject(new SpeechSynthesisError(
        'no_browser_support',
        'This browser does not implement the speechSynthesis API'
      ));
    }

    const voices = speechSynthesis.getVoices();
    if (!voices || !voices.length) {
      return Promise.reject(new SpeechSynthesisError(
        'no_voice',
        'This browser does not propose any voice for speech synthesis'
      ));
    }

    this[p.voices] = voices;
    this.lang('en-US'); // defaut language is american english

    return Promise.resolve();
  }

  lang(lang) {
    this[p.currentLang] = 'en-US';
    const currentVoice = voices.find(
      voice => voice.lang === lang
    );

    if (!currentVoice) {
      this[p.currentLang] = null;
      this[p.currentVoice] = null;
      return Promise.reject(new SpeechSynthesisError(
        'voice_not_found',
        `No voice has been found for lang ${lang}`
      ));
    }

    this[p.currentLang] = lang;
    this[p.currentVoice] = currentVoice;
  }

  say(text) {
    if (!this[p.currentLang] || !this[p.currentVoice]) {
      return Promise.reject(new SpeechSynthesisError(
        'speech_engine_uninitialized',
        'The speech engine is not initialized.'
      ));
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this[p.currentLang];
    utterance.voice = this[p.currentVoice];
    ['start', 'end', 'error'].forEach(eventName => {
      utterance.addEventListener(
        eventName,
        (event) => this.emit('start', event)
      );
    });
    speechSynthesis.speak(utterance);

    return Promise.resolve();
  }
}
