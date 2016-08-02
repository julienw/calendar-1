/* global URLSearchParams */

'use strict';

import EventDispatcher from '../common/event-dispatcher';
import Settings from '../common/settings';

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
    super(['login', 'online', 'push-message', 'serviceworkerchange']);

    // Private properties.
    this[p.settings] = settings || new Settings();
    this[p.net] = net || new Network(this[p.settings]);
    this[p.api] = new API(this[p.net], this[p.settings]);
    this[p.webPush] = new WebPush(this[p.api], this[p.settings]);

    // Init
    this.reminders = new Reminders(this[p.api], this[p.settings]);

    this[p.net].on('online', (online) => this.emit('online', online));
    this[p.webPush].on('message', (msg) => this.emit('push-message', msg));
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => this.emit('serviceworkerchange')
    );

    window.server = this;

    Object.seal(this);
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
        this.emit('login');
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
   * @return {Promise}
   */
  subscribeToNotifications() {
    if (!this.isLoggedIn) {
      return Promise.reject(new Error(
        'Error while subscribing to push notifications: user is not logged in'
      ));
    }
    return this[p.webPush].subscribeToNotifications();
  }

  clearServiceWorker() {
    if (navigator.serviceWorker) {
      return navigator.serviceWorker.ready
        .then((registration) => registration.unregister());
    }

    return Promise.resolve();
  }
}
