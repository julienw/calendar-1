import BaseController from './base';
import UsersController from './users';
import RemindersController from './reminders';

import SpeechController from '../lib/speech-controller';
import Server from '../lib/server/index';

const p = Object.freeze({
  controllers: Symbol('controllers'),
  speechController: Symbol('speechController'),
  server: Symbol('server'),
  subscribeToNotifications: Symbol('subscribeToNotifications'),

  onHashChanged: Symbol('onHashChanged'),
});

export default class MainController extends BaseController {
  constructor() {
    super();

    const mountNode = document.querySelector('.app-view-container');
    const speechController = new SpeechController();
    const server = new Server();
    const options = { mountNode, speechController, server };

    const usersController = new UsersController(options);
    const remindersController = new RemindersController(options);

    this[p.controllers] = {
      '': usersController,
      'users/(.+)': usersController,
      'reminders': remindersController,
    };

    this[p.speechController] = speechController;
    this[p.server] = server;

    window.addEventListener('hashchange', this[p.onHashChanged].bind(this));
  }

  main() {
    if (screen && 'orientation' in screen && 'lock' in screen.orientation) {
      screen.orientation.lock('landscape')
        .catch((e) => {
          console.error(e);
        });
    }

    this[p.speechController].start()
      .then(() => {
        console.log('Speech controller started');
      });

    this[p.server].on('login', () => this[p.subscribeToNotifications]());
    this[p.server].on('push-message', (message) => {
      // if we're in "speaking reminders" mode (which is "always", currently)
      this[p.speechController].speak(`${message.title}: ${message.body}`);
    });

    location.hash = '';

    setTimeout(() => {
      if (this[p.server].isLoggedIn) {
        this[p.subscribeToNotifications]();
        location.hash = 'reminders';
      } else {
        location.hash = 'users/login';
      }
    });
  }

  /**
   * Handles hash change event and routes to the right controller.
   *
   * @private
   */
  [p.onHashChanged]() {
    const route = window.location.hash.slice(1);

    for (const routeName of Object.keys(this[p.controllers])) {
      const match = route.match(new RegExp(`^${routeName}$`));
      if (match) {
        this[p.controllers][routeName].main(...match.slice(1));
        break;
      }
    }
  }

  [p.subscribeToNotifications]() {
    this[p.server].subscribeToNotifications()
      .catch((err) => {
        console.error('Error while subscribing to notifications:', err);
      });
  }
}
