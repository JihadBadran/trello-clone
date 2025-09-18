const toCamel = (s: string): string => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const isArray = function (a: unknown): a is unknown[] {
  return Array.isArray(a);
};

const isObject = function (o: unknown): o is Record<string, unknown> {
  return o === Object(o) && !isArray(o) && typeof o !== 'function';
};

export const toCamelCase = function <T>(o: T): T {
  if (isObject(o)) {
    const n: Record<string, unknown> = {};

    Object.keys(o).forEach((k) => {
      const value = (o as Record<string, unknown>)[k];
      n[toCamel(k)] = toCamelCase(value);
    });

    return n as T;
  } else if (isArray(o)) {
    return o.map((i) => {
      return toCamelCase(i);
    }) as T;
  }

  return o;
};
