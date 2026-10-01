'use strict';

class SecretRedactor {
  constructor() {
    this.patterns = [
      /api[_-]?key\s*[:=]\s*[^\s,}]+/gi,

      /authorization\s*[:=]\s*[^\s,}]+/gi,

      /bearer\s+[A-Za-z0-9._~+/=-]+/gi,

      /password\s*[:=]\s*[^\s,}]+/gi,

      /secret\s*[:=]\s*[^\s,}]+/gi,

      /token\s*[:=]\s*[^\s,}]+/gi,

      /DATABASE_URL\s*[:=]\s*[^\s,}]+/gi
    ];
  }

  redact(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return value;
    }

    if (
      typeof value === 'string'
    ) {
      let result = value;

      for (
        const pattern
        of this.patterns
      ) {
        result =
          result.replace(
            pattern,
            match => {
              const index =
                match.search(/[:=]/);

              if (index === -1) {
                return '[REDACTED]';
              }

              return (
                match.slice(
                  0,
                  index + 1
                ) +
                ' [REDACTED]'
              );
            }
          );
      }

      return result;
    }

    if (
      Array.isArray(value)
    ) {
      return value.map(
        item =>
          this.redact(item)
      );
    }

    if (
      typeof value === 'object'
    ) {
      const output = {};

      for (
        const [key, val]
        of Object.entries(value)
      ) {
        if (
          /password|secret|token|api[_-]?key|authorization/i
            .test(key)
        ) {
          output[key] =
            '[REDACTED]';

          continue;
        }

        output[key] =
          this.redact(val);
      }

      return output;
    }

    return value;
  }
}

module.exports =
  SecretRedactor;
