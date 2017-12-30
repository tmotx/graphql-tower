/* eslint-disable no-console */
import _ from 'lodash';
import http from 'http';
import faker from 'faker';
import chalk from 'chalk';
import express from 'express';
import cors from 'cors';
import opn from 'opn';
import graphqlHTTP from 'express-graphql';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import {
  execute,
  subscribe,
  isLeafType,
  isAbstractType,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
} from 'graphql';
import {
  GraphQLGID,
  GraphQLSentence,
  GraphQLMobile,
  GraphQLDate,
  GraphQLEmail,
  GraphQLDateTime,
  GraphQLTimeZone,
  GraphQLExpiration,
  GraphQLAge,
  GraphQLJSON,
} from 'graphql-tower-types';
import {
  isGlobalId,
  toGlobalId,
  fromGlobalId,
} from 'graphql-tower-global-id';

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

const defaultTypes = _.mapKeys([
  GraphQLGID,
  GraphQLSentence,
  GraphQLMobile,
  GraphQLDate,
  GraphQLEmail,
  GraphQLDateTime,
  GraphQLTimeZone,
  GraphQLExpiration,
  GraphQLAge,
  GraphQLJSON,
], type => type.name);

export default function (schema, options = {}) {
  const pubsub = new PubSub();
  const typeFakers = _.assign({}, defaultTypeFakers, options.typeFakers);
  const types = _.assign({}, defaultTypes, options.types);

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
      return (payload, args, context, info) => {
        const first = _.get(args, ['first'], _.get(info, ['variableValues', 'first']));
        return _.map(_.range(first || 1000), getResolver(type.ofType, field, obj));
      };
    }

    if (isAbstractType(type)) {
      const possibleTypes = schema.getPossibleTypes(type);
      return (payload, args) => {
        const id = _.get(args, ['id']);
        if (isGlobalId(id)) {
          const { type: idType } = fromGlobalId(id);
          return { __typename: idType };
        }
        return { __typename: _.sample(possibleTypes) };
      };
    }

    return fieldResolver(type, field, obj);
  }

  _.forEach(schema.getTypeMap(), (type) => {
    if (isLeafType(type) && types[type.name]) {
      _.assign(type, types[type.name]);
    }

    if (isLeafType(type) && !typeFakers[type.name]) {
      console.log(`    ${chalk.red(`Not Found ${type.name} Type.`)}`);
    }

    if (type instanceof GraphQLObjectType && !type.name.startsWith('__')) {
      _.forEach(type.getFields(), (field) => {
        _.set(field, 'resolve', getResolver(field.type, field, type));
        _.set(field, 'subscribe', () => pubsub.asyncIterator('subscribe'));
      });
    }

    if (isAbstractType(type)) {
      _.set(type, ['resolveType'], (obj => _.get(obj, ['__typename'])));
    }
  });

  const subscriptionTimer = () => setTimeout(() => {
    pubsub.publish('subscribe', {});
    subscriptionTimer();
  }, 1000);

  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server, path: '/graphql' },
  );

  const { port } = options;
  const listener = server.listen(port, () => {
    console.log(`
      ${chalk.green('✔')} Your GraphQL Fake API is ready to use 🚀
      Here are your links:

      ${chalk.blue('❯')} GraphQL API:\t http://localhost:${listener.address().port}/graphql
      ${chalk.blue('❯')} WebSocket API:\t ws://localhost:${listener.address().port}/graphql
    `);

    subscriptionTimer();

    setTimeout(() => opn(`http://localhost:${listener.address().port}/graphql`), 500);
  });

  return listener;
}
