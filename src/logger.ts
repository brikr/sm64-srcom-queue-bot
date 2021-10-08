export class Logger {
  static stringify(input: unknown): string {
    const seen = new WeakSet();
    return JSON.stringify(input, (_key: unknown, value: unknown) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    });
  }

  static log(message: unknown) {
    if (typeof message === 'string') {
      console.log(message);
    } else {
      console.log(this.stringify(message));
    }
  }

  static debug(message: unknown) {
    if (typeof message === 'string') {
      console.debug(message);
    } else {
      console.debug(this.stringify(message));
    }
  }

  static error(message: unknown) {
    if (typeof message === 'string') {
      console.error(message);
    } else {
      console.error(this.stringify(message));
    }
  }
}
