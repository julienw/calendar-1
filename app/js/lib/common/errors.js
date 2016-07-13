export function HttpError(statusCode, message) {
  this.message = message;
  this.statusCode = statusCode;
  this.name = 'HttpError';
  Error.call(this);
}

HttpError.prototype = Object.create(Error.prototype);
