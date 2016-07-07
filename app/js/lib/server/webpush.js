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

  subscribeToNotifications(resubscribe = false) {
    if (!navigator.serviceWorker) {
      return Promise.reject('No service worker supported');
    }

    navigator.serviceWorker.addEventListener('message',
      this[p.listenForMessages].bind(this));

    return navigator.serviceWorker.ready
      .then((reg) => {
        reg.pushManager.getSubscription()
          .then((existing) => {
            if (existing && !resubscribe) {
              // nothing left to do
              // @todo We should check if we have this subscription on the
              // server, if not re-register it on calendar's server.
              // https://github.com/fxbox/calendar/issues/20
              return;
            }

            return reg.pushManager.subscribe({ userVisibleOnly: true })
              .then((subscription) =>
                this[p.api].post('subscriptions', {
                  subscription,
                  title: `Browser ${navigator.userAgent}`,
                })
              );
          }).catch((error) => {
            if (Notification.permission === 'denied') {
              throw new Error('Permission request was denied.');
            }

            console.error('Error while saving subscription ', error);
            throw new Error(`Subscription error: ${error}`);
          });
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
