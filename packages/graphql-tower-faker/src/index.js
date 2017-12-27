/* eslint-disable no-console */
import _ from 'lodash';
import faker from 'faker';
import chalk from 'chalk';
import opn from 'opn';
import express from 'express';
import graphqlHTTP from 'express-graphql';
import {
  isAbstractType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
} from 'graphql';
import { toGlobalId } from 'graphql-tower-global-id';

const defaultTypeFakers = {
  Int: () => faker.random.number(),
  Float: () => faker.random.number(),
  String: () => faker.lorem.sentences(),
  Boolean: () => faker.random.boolean(),
  ID: () => Buffer.from(`${faker.random.number({ max: 9999999999 })}`).toString('base64'),
  GlobalID: (field, obj) => toGlobalId(_.toString(obj), faker.random.uuid()),
  Sentence: () => faker.lorem.sentence(),
  Mobile: () => faker.phone.phoneNumber('88600009########'),
  Date: () => new Date(),
  Email: () => faker.internet.email(),
  DateTime: () => new Date(),
  TimeZone: () => faker.random.number({ min: -24, max: 24 }),
  Expiration: () => _.sample([faker.date.future(), false]),
  Age: () => faker.random.number({ min: 1, max: 100 }),
  JSON: () => faker.helpers.createCard(),
};

export default function (schema, options = {}) {
  const typeFakers = _.assign({}, defaultTypeFakers, options.typeFakers);

  function fieldResolver(type, field, obj) {
    if (type instanceof GraphQLEnumType) {
      const values = type.getValues().map(({ value }) => value);
      return () => _.sample(values);
    }

    const typeFaker = typeFakers[type.name];
    if (typeFaker) return () => typeFaker(field, obj);

    return () => `<${type.name}>`;
  }

  function getResolver(type, field, obj) {
    if (type instanceof GraphQLNonNull) {
      return getResolver(type.ofType, field, obj);
    }

    if (type instanceof GraphQLList) {
      return () => _.map(_.range(1000), getResolver(type.ofType, field, obj));
    }

    if (isAbstractType(type)) {
      const possibleTypes = schema.getPossibleTypes(type);
      return () => ({ __typename: _.sample(possibleTypes) });
    }

    return fieldResolver(type, field, obj);
  }

  _.forEach(schema.getTypeMap(), (type) => {
    if (type instanceof GraphQLScalarType) {
      const typeFaker = typeFakers[type.name];
      if (!typeFaker) console.log(`    ${chalk.red(`Not Found ${type.name} Type.`)}`);
    }

    if (type instanceof GraphQLObjectType && !type.name.startsWith('__')) {
      _.forEach(type.getFields(), (field) => {
        _.set(field, 'resolve', getResolver(field.type, field, type));
      });
    }

    if (isAbstractType(type)) {
      _.set(type, ['resolveType'], (obj => _.get(obj, ['__typename'])));
    }
  });

  const app = express();
  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));

  const { port } = options;
  const listener = app.listen(port, () => {
    console.log(`address().port
      ${chalk.green('✔')} Your GraphQL Fake API is ready to use 🚀
      Here are your links:

      ${chalk.blue('❯')} GraphQL API:\t http://localhost:${listener.address().port}/graphql
    `);

    setTimeout(() => opn(`http://localhost:${listener.address().port}/graphql`), 500);
  });

  return listener;
}
