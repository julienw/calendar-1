'use strict';

import EventDispatcher from '../common/event-dispatcher';
import { HttpError } from '../common/errors';

// Private members
const p = Object.freeze({
  // Properties,
  api: Symbol('api'),
  settings: Symbol('settings'),

  // Methods:
  listenForMessages: Symbol('listenForMessages'),
});

export default class WebPush extends EventDispatcher {
  constructor(api, settings) {
    super(['message']);

    this[p.api] = api;
    this[p.settings] = settings;

    Object.seal(this);
  }

  subscribeToNotifications() {
    if (!navigator.serviceWorker) {
      return Promise.reject('No service worker supported');
    }

    navigator.serviceWorker.addEventListener('message',
      this[p.listenForMessages].bind(this));

    return navigator.serviceWorker.ready
      .then(
        (reg) => reg.pushManager.getSubscription()
          .then((existing) =>
            existing || reg.pushManager.subscribe({ userVisibleOnly: true })
          )
      )
      .then((subscription) =>
        // The server checks for duplicates
        this[p.api].post('subscriptions', {
          subscription,
          title: `Browser ${navigator.userAgent}`,
        })
      )
      .catch((error) => {
        if (Notification.permission === 'denied') {
          throw new Error('Permission request was denied.');
        }

        // "409 Conflict" HTTP result is OK.
        if ((error instanceof HttpError) && error.statusCode === 409) {
          return;
        }

        throw new Error(
          `There was an error while subscribing to push notifications: ${error}`
        );
      });
  }

  [p.listenForMessages](evt) {
    if (!evt.data) {
      console.error('Received a push message without a payload.');
      return;
    }
    this.emit('message', evt.data);
  }
}
