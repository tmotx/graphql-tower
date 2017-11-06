import isObject from 'lodash/isObject';
import toNumber from 'lodash/toNumber';
import moment from 'moment';
import { isGlobalId, toGlobalId } from 'graphql-tower-global-id';
import { GraphQLScalarType, GraphQLEnumType } from 'graphql';

export const GraphQLResponseStatus = new GraphQLEnumType({
  name: 'ResponseStatus',
  values: {
    failed: { value: 0 },
    ok: { value: 1 },
  },
});

export function parseGlobalId(value) {
  const id = String(value);

  if (!/^[0-9A-Za-z]+$/.test(id)) {
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

export const parseMobile = (value) => {
  const mobile = String(value);

  if (!/^[1-9]{1,5}0[0-9]{12}$/.test(mobile)) {
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
