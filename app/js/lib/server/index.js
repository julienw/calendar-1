/* global URLSearchParams */

'use strict';

import EventDispatcher from '../common/event-dispatcher';

import Settings from './settings';
import Network from './network';
import WebPush from './webpush';
import API from './api';
import Reminders from './reminders';

// Private members.
const p = Object.freeze({
  // Private properties.
  settings: Symbol('settings'),
  net: Symbol('net'),
  webPush: Symbol('webPush'),
  api: Symbol('api'),
});

export default class Server extends EventDispatcher {
  constructor({ settings, net } = {}) {
    super(['online']);

    // Private properties.
    this[p.settings] = settings || new Settings();
    this[p.net] = net || new Network(this[p.settings]);
    this[p.api] = new API(this[p.net], this[p.settings]);
    this[p.webPush] = new WebPush(this[p.api], this[p.settings]);

    // Init
    this.reminders = new Reminders(this[p.api], this[p.settings]);

    this[p.net].on('online', (online) => this.emit('online', online));
    this[p.webPush].on('message', (msg) => this.emit('push-message', msg));

    window.server = this;

    Object.seal(this);
  }

  /**
   * Clear all data/settings stored on the browser. Use with caution.
   *
   * @param {boolean} ignoreServiceWorker
   * @return {Promise}
   */
  clear(ignoreServiceWorker = true) {
    const promises = [this[p.settings].clear()];

    if (!navigator.serviceWorker && !ignoreServiceWorker) {
      promises.push(navigator.serviceWorker.ready
        .then((registration) => registration.unregister()));
    }

    return Promise.all(promises);
  }

  get online() {
    return this[p.net].online;
  }

  get isLoggedIn() {
    return !!this[p.settings].session;
  }

  /**
   * Authenticate a user.
   *
   * @param {string} user
   * @param {string} password
   * @return {Promise}
   */
  login(user, password) {
    return this[p.api].post('login', { user, password })
      .then((res) => {
        this[p.settings].session = res.token;
      });
  }

  /**
   * Log out the user.
   *
   * @return {Promise}
   */
  logout() {
    this[p.settings].session = null;
    return Promise.resolve();
  }

  /**
   * Ask the user to accept push notifications from the server.
   * This method will be called each time that we log in, but will stop the
   * execution if we already have the push subscription information.
   *
   * @param {boolean} resubscribe Parameter used for testing purposes, and
   * follow the whole subscription process even if we already have a push
   * subscription information.
   * @return {Promise}
   */
  subscribeToNotifications(resubscribe = false) {
    if (!this.isLoggedIn) {
      return Promise.reject(new Error(
        'Subscribing to push notifications is not possible ' +
        'because the user is not logged in yet.'
      ));
    }
    return this[p.webPush].subscribeToNotifications(resubscribe);
  }
}
