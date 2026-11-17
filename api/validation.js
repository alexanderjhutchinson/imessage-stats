export class ValidationError extends Error {}

export function parseNumber(value, name) {
  if (value == undefined || value == "") return null;

  if (!/^\d+$/.test(value)) {
    throw new ValidationError(`${name} must be a whole number`);
  }
  return Number(value);
}

export function parseDate(value, name) {
  if (value == undefined || value == "") return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${name} must be a date in YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${name} must be a real calendar date`);
  }
  return value;
}

export function parseFilters(query) {
  const filters = {
    chat: parseNumber(query.chat, "chat"),
    person: parseNumber(query.person, "person"),
    from: parseDate(query.from, "from"),
    to: parseDate(query.to, "to"),
  };

  if (filters.from && filters.to && filters.from > filters.to) {
    throw new ValidationError("from must be on or before to");
  }
  return filters;
}

export function parseChoice(value, name, allowed) {
  if (value === undefined || value === "") return null;

  if (!allowed.includes(value)) {
    throw new ValidationError(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}
