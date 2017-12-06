/* eslint no-underscore-dangle: ["error", { "allow": ["_fields"] }] */

import isObject from 'lodash/isObject';
import isNaN from 'lodash/isNaN';
import toNumber from 'lodash/toNumber';
import moment from 'moment';
import { isGlobalId, toGlobalId } from 'graphql-tower-global-id';
import { GraphQLScalarType, GraphQLObjectType, GraphQLEnumType } from 'graphql';

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
  serialize: String,
  parseValue: parseGlobalId,
  parseLiteral: (ast) => {
    try { return parseGlobalId(ast.value); } catch (e) { return null; }
  },
});

export const parseDate = (value) => {
  const date = moment(new Date(/^[0-9]+$/.test(value) ? toNumber(value) : value));

  if (!date.isValid()) {
    throw new TypeError(`Date cannot represent non value: ${value}`);
  }

  return date.toDate();
};

export const GraphQLDate = new GraphQLScalarType({
  name: 'Date',
  serialize: value => moment(value).utc().format(),
  parseValue: parseDate,
  parseLiteral: (ast) => {
    try { return parseDate(ast.value); } catch (e) { return null; }
  },
});

export const GraphQLExpiration = new GraphQLScalarType({
  name: 'Expiration',
  serialize: (value) => {
    if (!value) return false;

    const date = moment(value);
    if (!date.isAfter()) return false;

    return date.utc().format();
  },
  parseValue: parseDate,
  parseLiteral: (ast) => {
    try { return parseDate(ast.value); } catch (e) { return null; }
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
  serialize: String,
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
  serialize: String,
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
  serialize: value => (isObject(value) ? value : JSON.parse(value)),
  parseValue: parseJSON,
  parseLiteral: (ast) => {
    try { return parseJSON(ast.value); } catch (e) { return null; }
  },
});

// http://emailregex.com/
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // eslint-disable-line

export const parseEmail = (value) => {
  const email = String(value);

  if (!emailRegex.test(email)) {
    throw new TypeError(`Email cannot represent non value: ${email}`);
  }

  return email;
};

export const GraphQLEmail = new GraphQLScalarType({
  name: 'Email',
  serialize: String,
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

  return moment(Date.now())
    .utc()
    .set({
      month: 0, date: 1, hour: 0, minute: 0, second: 0, millisecond: 0,
    })
    .add(-age, 'year')
    .toDate();
};

export const GraphQLAge = new GraphQLScalarType({
  name: 'Age',
  serialize: value => moment(value).diff(Date.now(), 'year') * -1,
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
