export function SpeechSynthesisError(code, message, data) {
  this.code = code;
  this.message = message;
  this.name = 'SpeechSynthesisError';
  if (data) {
    this.data = data;
  }
  Error.call(this);
}

SpeechSynthesisError.prototype = Object.create(Error.prototype);

