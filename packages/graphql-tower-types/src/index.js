/* eslint no-underscore-dangle: ["error", { "allow": ["_fields"] }] */

import isObject from 'lodash/isObject';
import isNaN from 'lodash/isNaN';
import toNumber from 'lodash/toNumber';
import { isGlobalId, toGlobalId } from 'graphql-tower-global-id';
import { GraphQLScalarType, GraphQLObjectType, GraphQLEnumType } from 'graphql';

function pad(value) {
  if (value < 10) return `0${value}`;
  return value;
}

export const GraphQLResponseStatus = new GraphQLEnumType({
  name: 'ResponseStatus',
  values: {
    failed: { value: 0 },
    ok: { value: 1 },
  },
});

export function parseGlobalId(value) {
  const id = String(value);

  if (!isGlobalId(id)) {
    throw new TypeError('invalid global id');
  }

  return id;
}

export const GraphQLGID = new GraphQLScalarType({
  name: 'GlobalID',
  description: 'The global id of an object',
  serialize: parseGlobalId,
  parseValue: parseGlobalId,
  parseLiteral: (ast) => {
    try { return parseGlobalId(ast.value); } catch (e) { return null; }
  },
});

export const parseDate = (value) => {
  const date = new Date(/^[0-9]+$/.test(value) ? toNumber(value) : value);

  if (isNaN(date.getTime())) {
    throw new TypeError(`Date cannot represent non value: ${value}`);
  }

  return date.toISOString().substr(0, 10);
};

export const GraphQLDate = new GraphQLScalarType({
  name: 'Date',
  serialize: parseDate,
  parseValue: parseDate,
  parseLiteral: (ast) => {
    try { return parseDate(ast.value); } catch (e) { return null; }
  },
});

export const parseDateTime = (value) => {
  const date = new Date(/^[0-9]+$/.test(value) ? toNumber(value) : value);

  if (isNaN(date.getTime())) {
    throw new TypeError(`Date cannot represent non value: ${value}`);
  }

  return date;
};

export const GraphQLDateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize: value => new Date(value).toISOString(),
  parseValue: parseDateTime,
  parseLiteral: (ast) => {
    try { return parseDateTime(ast.value); } catch (e) { return null; }
  },
});

const timezoneRegex = /^[+-](?:2[0-3]|[01][0-9]):[0-5][0-9]$/;
export const parseTimeZone = (value) => {
  if (timezoneRegex.test(value)) return value;

  let zone = toNumber(value);

  if (isNaN(zone)) {
    throw new TypeError(`TimeZone cannot represent non value: ${value}`);
  }

  zone *= (zone < 24 && zone > -24) ? 60 : -1;

  const abs = Math.abs(zone);
  return `${zone >= 0 ? '+' : '-'}${pad(parseInt(abs / 60, 10) % 24)}:${pad(abs % 60)}`;
};

export const GraphQLTimeZone = new GraphQLScalarType({
  name: 'TimeZone',
  serialize: parseTimeZone,
  parseValue: parseTimeZone,
  parseLiteral: (ast) => {
    try { return parseTimeZone(ast.value); } catch (e) { return null; }
  },
});

export const GraphQLExpiration = new GraphQLScalarType({
  name: 'Expiration',
  serialize: (value) => {
    if (!value) return false;

    const date = new Date(value);
    if (date.getTime() < Date.now()) return false;

    return date.toISOString();
  },
  parseValue: parseDateTime,
  parseLiteral: (ast) => {
    try { return parseDateTime(ast.value); } catch (e) { return null; }
  },
});

export const parseSentence = (value) => {
  const sentence = String(value);

  if (sentence.length > 255) {
    throw new TypeError('sentence length exceeds the maximum length of 255');
  }

  return sentence;
};

export const GraphQLSentence = new GraphQLScalarType({
  name: 'Sentence',
  serialize: parseSentence,
  parseValue: parseSentence,
  parseLiteral: (ast) => {
    try { return parseSentence(ast.value); } catch (e) { return null; }
  },
});

const mobileRegex = /^[1-9]{1,5}0[0-9]{12}$/;
export const parseMobile = (value) => {
  const mobile = String(value);

  if (!mobileRegex.test(mobile)) {
    throw new TypeError(`Mobile cannot represent non value: ${mobile}`);
  }

  return mobile;
};

export const GraphQLMobile = new GraphQLScalarType({
  name: 'Mobile',
  serialize: parseMobile,
  parseValue: parseMobile,
  parseLiteral: (ast) => {
    try { return parseMobile(ast.value); } catch (e) { return null; }
  },
});

export const parseJSON = (value) => {
  if (isObject(value)) return value;
  return JSON.parse(value);
};

export const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  serialize: parseJSON,
  parseValue: parseJSON,
  parseLiteral: (ast) => {
    try { return parseJSON(ast.value); } catch (e) { return null; }
  },
});

// http://emailregex.com/
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const parseEmail = (value) => {
  const email = String(value);

  if (!emailRegex.test(email)) {
    throw new TypeError(`Email cannot represent non value: ${email}`);
  }

  return email;
};

export const GraphQLEmail = new GraphQLScalarType({
  name: 'Email',
  serialize: parseEmail,
  parseValue: parseEmail,
  parseLiteral: (ast) => {
    try { return parseEmail(ast.value); } catch (e) { return null; }
  },
});

export const GraphQLGender = new GraphQLEnumType({
  name: 'Gender',
  values: {
    male: { value: 1 },
    female: { value: 2 },
  },
});

export const parseAge = (value) => {
  const age = parseInt(value, 10);

  if (isNaN(age) || age < 1 || age > 150) {
    throw new TypeError(`Age cannot represent non value: ${age}`);
  }

  return new Date(Date.UTC(new Date(Date.now()).getUTCFullYear() - age, 0, 1, 0, 0, 0));
};

export const GraphQLAge = new GraphQLScalarType({
  name: 'Age',
  serialize: value => new Date(Date.now()).getUTCFullYear() - new Date(value).getUTCFullYear(),
  parseValue: parseAge,
  parseLiteral: (ast) => {
    try { return parseAge(ast.value); } catch (e) { return null; }
  },
});

export class GraphQLInheritanceType extends GraphQLObjectType {
  getFields() {
    if (!this._fields) {
      const interfaces = this.getInterfaces().map(item => item.getFields());
      this._fields = Object.assign({}, ...interfaces, super.getFields());
    }

    return this._fields;
  }
}

export class GraphQLGlobalIdField {
  type = GraphQLGID;

  description = 'The global id of an object';

  typeName = 'type';

  constructor(typeName) {
    this.typeName = typeName;
  }

  resolve = (payload, args, context, info) => {
    const value = isObject(payload) ? payload[info.fieldName] : payload;
    const typeName = this.typeName || info.parentType.name;

    return isGlobalId(value) ? value : toGlobalId(typeName, value);
  }
}
