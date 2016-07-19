import React from 'components/react';
import _ from 'components/lodash';
import moment from 'components/moment';

import ReminderItem from './reminders/reminder-item';

export default class Reminders extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      reminders: [],
    };

    this.speechController = props.speechController;
    this.server = props.server;
    this.refreshInterval = null;
    this.debugEvent = this.debugEvent.bind(this);
    this.onReminder = this.onReminder.bind(this);

    moment.locale(navigator.languages || navigator.language || 'en-US');
  }

  componentDidMount() {
    this.server.reminders.getAll()
      .then((reminders) => {
        reminders = reminders.map((reminder) => ({
          id: reminder.id,
          recipients: reminder.recipients,
          content: reminder.action,
          datetime: reminder.due,
        }));

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
  }

  debugEvent(evt) {
    if (evt.result !== undefined) {
      console.log(evt.type, evt.result);
      return;
    }

    console.log(evt.type);
  }

  onReminder(evt) {
    const reminder = evt.result;

    // @todo Nice to have: optimistic update.
    // https://github.com/fxbox/calendar/issues/32
    this.server.reminders
      .set({
        recipients: reminder.users,
        action: reminder.action,
        due: Number(reminder.time),
      })
      .then((savedReminder) => {
        const reminders = this.state.reminders;

        reminders.push({
          id: savedReminder.id,
          recipients: savedReminder.recipients,
          content: savedReminder.action,
          datetime: savedReminder.due,
        });

        this.setState({ reminders });

        console.log('Voice confirmation:', reminder.confirmation);
        this.speechController.speak(reminder.confirmation);
      })
      .catch((res) => {
        // @todo Add some feedback and remove the reminder from the list:
        // https://github.com/fxbox/calendar/issues/24
        console.error('Saving the reminder failed.', res);
      });
  }

  onDelete(id) {
    // @todo Nice to have: optimistic update.
    // https://github.com/fxbox/calendar/issues/32
    this.server.reminders.delete(id)
      .then(() => {
        const reminders = this.state.reminders
          .filter((reminder) => reminder.id !== id);
        this.setState({ reminders });
      })
      .catch(() => {
        console.error(`The reminder ${id} could not be deleted.`);
      });
  }

  // @todo Add a different view when there's no reminders:
  // https://github.com/fxbox/calendar/issues/16
  render() {
    let reminders = this.state.reminders;

    // Sort all the reminders chronologically.
    reminders = reminders.sort((a, b) => {
      return a.datetime - b.datetime;
    });

    // Group the reminders by month.
    reminders = _.groupBy(reminders, (reminder) => {
      return moment(reminder.datetime).format('YYYY/MM');
    });

    // For each month, group the reminders by day.
    Object.keys(reminders).forEach((month) => {
      reminders[month] = _.groupBy(reminders[month], (reminder) => {
        return moment(reminder.datetime).format('YYYY/MM/DD');
      });
    });

    const reminderNodes = Object.keys(reminders).map((key) => {
      const month = moment(key, 'YYYY/MM').format('MMMM');
      const reminderMonth = reminders[key];

      return (
        <div key={key}>
          <h2 className="reminders__month">{month}</h2>
          {Object.keys(reminderMonth).map((key) => {
            const date = moment(key, 'YYYY/MM/DD');
            const remindersDay = reminderMonth[key];

            return (
              <div key={key} className="reminders__day">
                <div className="reminders__day-date">
                  <div className="reminders__day-mday">
                    {date.format('DD')}
                  </div>
                  <div className="reminders__day-wday">
                    {date.format('ddd')}
                  </div>
                </div>
                <ol className="reminders__list">
                  {remindersDay.map((reminder) => {
                    return (<ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      onDelete={this.onDelete.bind(this, reminder.id)}
                    />);
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      );
    });

    return (
      <section className="reminders">
        {reminderNodes}
      </section>
    );
  }
}

Reminders.propTypes = {
  speechController: React.PropTypes.object.isRequired,
  server: React.PropTypes.object.isRequired,
};
