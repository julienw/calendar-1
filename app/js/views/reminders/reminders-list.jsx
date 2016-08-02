import React from 'components/react';
import _ from 'components/lodash';
import moment from 'components/moment';

import ReminderItem from './reminder-item';

export default class RemindersList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      reminders: props.reminders,
    };

    this.server = props.server;
  }

  componentWillReceiveProps(props) {
    this.setState({ reminders: props.reminders });
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

  render() {
    let reminders = this.state.reminders;

    // Sort all the reminders chronologically.
    reminders = reminders.sort((a, b) => {
      return a.due - b.due;
    });

    // Group the reminders by month.
    reminders = _.groupBy(reminders, (reminder) => {
      return moment(reminder.due).format('YYYY/MM');
    });

    // For each month, group the reminders by day.
    Object.keys(reminders).forEach((month) => {
      reminders[month] = _.groupBy(reminders[month], (reminder) => {
        return moment(reminder.due).format('YYYY/MM/DD');
      });
    });

    const remindersNode = Object.keys(reminders).map((key) => {
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
      <div>
        {remindersNode}
      </div>
    );
  }
}

RemindersList.propTypes = {
  server: React.PropTypes.object.isRequired,
  reminders: React.PropTypes.array.isRequired,
};
