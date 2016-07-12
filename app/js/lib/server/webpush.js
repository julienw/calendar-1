'use strict';

import EventDispatcher from '../common/event-dispatcher';

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

        throw new Error(
          `There was an error while subscribing to push notifications: ${error}`
        );
      });
  }

  [p.listenForMessages](evt) {
    const msg = evt.data || {};

    if (!msg.action) {
      return;
    }

    this.emit('message', msg);
  }
}
