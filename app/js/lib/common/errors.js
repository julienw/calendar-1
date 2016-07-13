export function HttpError(statusCode) {
  this.message = `The response returned a ${statusCode} HTTP status code.`;
  this.statusCode = statusCode;
  this.name = 'HttpError';
  Error.call(this);
}

HttpError.prototype = Object.create(Error.prototype);
