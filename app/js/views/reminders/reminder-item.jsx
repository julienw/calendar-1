/* global TwitterCldr, TwitterCldrDataBundle */

import React from 'components/react';
import moment from 'components/moment';
import 'components/cldr/en';
import 'components/cldr/core';

const COLOURS = ['red', 'orange', 'green', 'blue', 'violet'];

export default class ReminderItem extends React.Component {
  constructor(props) {
    super(props);

    TwitterCldr.set_data(TwitterCldrDataBundle);

    this.listFormatter = new TwitterCldr.ListFormatter();
    this.reminder = props.reminder;
    this.onDelete = props.onDelete;
  }

  getColour(recipients = []) {
    const name = recipients.join(' ');
    const hash = (string) => {
      let hash = 0, i, chr, len;
      if (string.length === 0) {
        return 0;
      }
      for (i = 0, len = string.length; i < len; i++) {
        chr = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    };

    return COLOURS[hash(name) % COLOURS.length];
  }

  render() {
    const reminder = this.reminder;
    const contentClassName = [
      'reminders__item-content',
      this.getColour(reminder.recipients),
    ]
      .join(' ');

    return (
      <li className="reminders__item">
        <div className="reminders__item-time">
          <div>{moment(reminder.due).format('LT')}</div>
        </div>
        <div className={contentClassName}>
          <h3 className="reminders__item-recipient">
            {this.listFormatter.format(reminder.recipients)}
          </h3>
          <p className="reminders__item-text">
            {reminder.action}
            <button className="reminders__delete"
                    onClick={this.onDelete}>
              Delete
            </button>
          </p>
        </div>
      </li>
    );
  }
}

ReminderItem.propTypes = {
  reminder: React.PropTypes.object.isRequired,
  onDelete: React.PropTypes.func.isRequired,
};
