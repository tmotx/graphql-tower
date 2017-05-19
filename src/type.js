import _ from 'lodash';
import moment from 'moment';
import { GraphQLScalarType, GraphQLEnumType } from 'graphql';

export const GraphQLResponseStatus = new GraphQLEnumType({
  name: 'ResponseStatus',
  values: {
    failed: { value: 0 },
    ok: { value: 1 },
  },
});

export const parseGlobalId = (value) => {
  const id = String(value);

  if (!/^[0-9A-Za-z]+$/.test(id)) {
    throw new TypeError('invalid global id');
  }

  return id;
};

export const GraphQLGID = new GraphQLScalarType({
  name: 'GlobalID',
  description: 'The global id of an object',
  serialize: String,
  parseValue: parseGlobalId,
  parseLiteral: ast => parseGlobalId(ast.value),
});

export const parseDate = (value) => {
  const date = moment(new Date(/^[0-9]+$/.test(value) ? _.toNumber(value) : value));

  if (!date.isValid()) {
    throw new TypeError(`Date cannot represent non value: ${value}`);
  }

  return date.toDate();
};

export const GraphQLDate = new GraphQLScalarType({
  name: 'Date',
  serialize: value => (value ? moment(value).utc().format() : null),
  parseValue: parseDate,
  parseLiteral: ast => parseDate(ast.value, ast),
});

export const GraphQLExpiration = new GraphQLScalarType({
  name: 'Expiration',
  serialize: (value) => {
    if (!value) return null;

    const date = moment(value);
    if (!date.isAfter()) return null;

    return date.utc().format();
  },
  parseValue: parseDate,
  parseLiteral: ast => parseDate(ast.value),
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
  parseLiteral: ast => parseSentence(ast.value),
});
