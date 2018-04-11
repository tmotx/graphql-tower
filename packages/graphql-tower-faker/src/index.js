/* eslint-disable no-console */
import _ from 'lodash';
import http from 'http';
import chalk from 'chalk';
import express from 'express';
import cors from 'cors';
import opn from 'opn';
import thunk from 'graphql-tower-helper/thunk';
import graphqlHTTP from 'express-graphql';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import {
  execute,
  subscribe,
  isAbstractType,
  GraphQLScalarType,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
} from 'graphql';
import {
  isGlobalId,
  toGlobalId,
  fromGlobalId,
} from 'graphql-tower-global-id';

const defaultTypeFakers = {
  Int: () => 99,
  Float: () => 9.99,
  String: () => 'String',
  Boolean: () => true,
  ID: () => 'ID',
};

export function fakerSchema(schema, options = {}) {
  const pubsub = new PubSub();
  const typeFakers = _.assign({}, defaultTypeFakers, options.typeFakers);

  function getResolver(type, field) {
    if (type instanceof GraphQLNonNull) {
      return getResolver(type.ofType, field);
    }

    if (type instanceof GraphQLList) {
      return (payload, args, context, info) => {
        const first = _.get(args, ['first'], _.get(info, ['variableValues', 'first']));
        return _.map(_.range(first || 3), getResolver(type.ofType, field));
      };
    }

    if (isAbstractType(type)) {
      const possibleTypes = schema.getPossibleTypes(type);
      return (payload, args) => {
        const id = _.get(args, ['id']);
        if (isGlobalId(id)) {
          const { type: idType } = fromGlobalId(id);
          return { id, __typename: idType };
        }
        return { id, __typename: _.sample(possibleTypes) };
      };
    }

    if (type.name === 'GlobalID') {
      return (payload, args, context, info) => {
        const value = _.get(payload, info.fieldName, payload);
        const typeName = info.parentType.name;

        return isGlobalId(value) ? value : toGlobalId(typeName, value);
      };
    }

    return payload => _.get(payload, [field.name], 'NULL');
  }

  _.forEach(schema.getTypeMap(), (type) => {
    if (type.name.startsWith('__')) return;

    if (type instanceof GraphQLScalarType) {
      const fake = typeFakers[type.name] || type.fake;
      if (!fake) {
        console.log(`    ${chalk.red(`Not Found Fake of ${type.name} Type.`)}`);
        return;
      }

      const thunkFake = thunk(fake);
      _.set(type, ['serialize'], value => (value === 'NULL' ? thunkFake(value) : value));
    }

    if (type instanceof GraphQLEnumType) {
      const values = type.getValues().map(({ name }) => name);
      const fake = typeFakers[type.name] || type.fake || values[0];
      const thunkFake = thunk(fake);
      _.set(type, 'serialize', value => (value === 'NULL' ? thunkFake(value) : value));
    }

    if (type instanceof GraphQLObjectType) {
      _.forEach(type.getFields(), (field) => {
        _.set(field, 'resolve', getResolver(field.type, field));
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

  subscriptionTimer();

  return schema;
}

export default function fakeServer(schema, options = {}) {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use('/graphql', graphqlHTTP({ schema: fakerSchema(schema, options), graphiql: true }));

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

    setTimeout(() => opn(`http://localhost:${listener.address().port}/graphql`), 500);
  });

  return listener;
}
