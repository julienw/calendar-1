import React from 'components/react';

const TYPES = [
  'success',
  'info',
  'warning',
  'danger',
];

export default class Toaster extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      display: false,
      message: '',
      type: 'success',
    };

    this.duration = 6000;
    this.timeout = null;
    this.hide = this.hide.bind(this);
  }

  success(message) {
    this.setState({ type: 'success' });
    this.show(message);
  }

  info(message) {
    this.setState({ type: 'info' });
    this.show(message);
  }

  warning(message) {
    this.setState({ type: 'warning' });
    this.show(message);
  }

  danger(message) {
    this.setState({ type: 'danger' });
    this.show(message);
  }

  show(message = '') {
    clearTimeout(this.timeout);
    this.setState({ display: true, message });
    this.timeout = setTimeout(this.hide, this.duration);
  }

  hide() {
    this.setState({ display: false });
  }

  validateType(candidate) {
    if (!TYPES.includes(candidate)) {
      return TYPES[0];
    }
    return candidate;
  }

  render() {
    const className = `toaster ${this.validateType(this.state.type)}`;
    const transform = this.state.display ?
      'translateY(0)' : 'translateY(-100%)';
    return (
      <div className={className} style={{ transform }}>
        <p>{this.state.message}</p>
      </div>
    );
  }
}
