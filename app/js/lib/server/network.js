'use strict';

import EventDispatcher from '../common/event-dispatcher';

const p = Object.freeze({
  // Private properties.
  settings: Symbol('settings'),
  online: Symbol('online'),

  // Private methods.
  init: Symbol('init'),
  fetch: Symbol('fetch'),
});

export default class Network extends EventDispatcher {
  constructor(settings) {
    super(['online']);

    this[p.settings] = settings;
    this[p.online] = false;

    Object.seal(this);

    this[p.init]();
  }

  /**
   * Attach event listeners related to the connection status.
   */
  [p.init]() {
    this[p.online] = navigator.onLine;

    window.addEventListener('online', (online) => {
      this[p.online] = online;
      this.emit('online', online);
    });
    window.addEventListener('offline', (online) => {
      this[p.online] = online;
      this.emit('online', online);
    });

    if ('connection' in navigator && 'onchange' in navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        const online = navigator.onLine;

        this[p.online] = online;
        this.emit('online', online);
      });
    }
  }

  get origin() {
    return this[p.settings].origin;
  }

  get online() {
    return this[p.online];
  }

  /**
   * Request a JSON from a specified URL.
   *
   * @param {string} url The URL to send the request to.
   * @param {string} method The HTTP method (defaults to "GET").
   * @param {Object} body An object of key/value.
   * @return {Promise}
   */
  fetchJSON(url, method = 'GET', body = undefined) {
    return this[p.fetch](url, 'application/json', method, body)
      .then((response) => response.json());
  }

  /**
   * Request a Blob from a specified URL.
   *
   * @param {string} url The URL to send the request to.
   * @param {string} blobType The Blob mime type (eg. image/jpeg).
   * @param {string=} method The HTTP method (defaults to "GET").
   * @param {Object=} body An object of key/value.
   * @return {Promise<Blob>}
   */
  fetchBlob(url, blobType, method, body) {
    return this[p.fetch](url, blobType, method, body)
      .then((response) => response.blob());
  }

  fetch(url, method, body) {
    return this[p.fetch](url, 'application/json', method, body);
  }

  /**
   * Request a content of the specified type from a specified URL.
   *
   * @param {string} url The URL to send the request to.
   * @param {string} accept The content mime type (eg. image/jpeg).
   * @param {string=} method The HTTP method (defaults to "GET").
   * @param {Object=} body An object of key/value.
   * @return {Promise<Response>}
   * @private
   */
  [p.fetch](url, accept, method = 'GET', body = undefined) {
    method = method.toUpperCase();

    const req = {
      method,
      headers: { Accept: accept },
      cache: 'no-store',
    };

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      req.headers['Content-Type'] = 'application/json;charset=UTF-8';
    }

    if (this[p.settings].session) {
      // The user is logged in, we authenticate the request.
      req.headers.Authorization = `Bearer ${this[p.settings].session}`;
    }

    if (body !== undefined) {
      req.body = JSON.stringify(body);
    }

    return fetch(url, req)
      .then((res) => {
        if (!res.ok) {
          throw new TypeError(
            `The response returned a ${res.status} HTTP status code.`
          );
        }

        return res;
      })
      .catch((error) => {
        console.error('Error occurred while fetching content: ', error);
        throw error;
      });
  }
}
