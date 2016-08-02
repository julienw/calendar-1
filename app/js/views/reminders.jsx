import React from 'components/react';
import moment from 'components/moment';

import Toaster from './toaster';
import RemindersList from './reminders/reminders-list';

export default class Reminders extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      reminders: [],
    };

    this.speechController = props.speechController;
    this.server = props.server;
    this.refreshInterval = null;
    this.toaster = null;
    this.debugEvent = this.debugEvent.bind(this);
    this.onReminder = this.onReminder.bind(this);
    this.onParsingFailure = this.onParsingFailure.bind(this);
    this.onWebPushMessage = this.onWebPushMessage.bind(this);
    this.onServiceworkerChange = this.onServiceworkerChange.bind(this);

    moment.locale(navigator.languages || navigator.language || 'en-US');
  }

  componentDidMount() {
    this.server.reminders.getAll()
      .then((reminders) => {
        this.setState({ reminders });
      });

    // Refresh the page every 5 minutes if idle.
    this.refreshInterval = setInterval(() => {
      if (this.speechController.idle) {
        location.reload(true);
      }
    }, 5 * 60 * 1000);

    this.speechController.on('wakelistenstart', this.debugEvent);
    this.speechController.on('wakelistenstop', this.debugEvent);
    this.speechController.on('wakeheard', this.debugEvent);
    this.speechController.on('speechrecognitionstart', this.debugEvent);
    this.speechController.on('speechrecognitionstop', this.debugEvent);
    this.speechController.on('reminder', this.debugEvent);
    this.speechController.on('reminder', this.onReminder);
    this.speechController.on('parsing-failed', this.onParsingFailure);
    this.server.on('push-message', this.onWebPushMessage);
    this.server.on('serviceworkerchange', this.onServiceworkerChange);
  }

  componentWillUnmount() {
    clearInterval(this.refreshInterval);

    this.speechController.off('wakelistenstart', this.debugEvent);
    this.speechController.off('wakelistenstop', this.debugEvent);
    this.speechController.off('wakeheard', this.debugEvent);
    this.speechController.off('speechrecognitionstart', this.debugEvent);
    this.speechController.off('speechrecognitionstop', this.debugEvent);
    this.speechController.off('reminder', this.debugEvent);
    this.speechController.off('reminder', this.onReminder);
    this.speechController.off('parsing-failed', this.onParsingFailure);
    this.server.off('push-message', this.onWebPushMessage);
  }

  debugEvent(evt) {
    if (evt.result !== undefined) {
      console.log(evt.type, evt.result);
      return;
    }

    console.log(evt.type);
  }

  onReminder(evt) {
    const { recipients, action, due, confirmation } = evt.result;

    // @todo Nice to have: optimistic update.
    // https://github.com/fxbox/calendar/issues/32
    this.server.reminders
      .set({
        recipients,
        action,
        due,
      })
      .then((reminder) => {
        const reminders = this.state.reminders;
        reminders.push(reminder);

        this.setState({ reminders });

        this.toaster.success(confirmation);
        this.speechController.speak(confirmation);
      })
      .catch((res) => {
        console.error('Saving the reminder failed.', res);
        const message = 'This reminder could not be saved. ' +
          'Please try again later.';
        this.toaster.warning(message);
        this.speechController.speak(message);
      });
  }

  onParsingFailure() {
    const message = 'I did not understand that. Can you repeat?';
    this.toaster.warning(message);
    this.speechController.speak(message);
  }

  onWebPushMessage(message) {
    const id = message.fullMessage.id;

    // We don't want to delete them, merely remove it from our local state.
    // At reload, we shouldn't get it because their status changed server-side
    // too.
    const reminders = this.state.reminders
      .filter((reminder) => reminder.id !== id);
    this.setState({ reminders });
  }

  onServiceworkerChange() {
    if (this.speechController.idle) {
      location.reload();
    } else {
      const message =
        'The application has just been updated. '+
        'You may experience random issues until the app is reloaded. ' +
        `We'll reload the app automatically soon.`;
      this.toaster.warning(message);
      this.speechController.once('idle', () => {
        location.reload();
      });
    }
  }

  // @todo Add a different view when there's no reminders:
  // https://github.com/fxbox/calendar/issues/16
  render() {
    return (
      <section className="reminders">
        <Toaster ref={(t) => this.toaster = t}/>
        <RemindersList reminders={this.state.reminders}
                       server={this.server}/>
      </section>
    );
  }
}

Reminders.propTypes = {
  speechController: React.PropTypes.object.isRequired,
  server: React.PropTypes.object.isRequired,
};
