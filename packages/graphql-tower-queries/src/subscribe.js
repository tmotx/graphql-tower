import assign from 'lodash/assign';
import get from 'lodash/get';
import { execute, createSourceEventStream, GraphQLError } from 'graphql';
import mapAsyncIterator from 'graphql/subscription/mapAsyncIterator';

function reportGraphQLError(error) {
  if (error instanceof GraphQLError) {
    return { errors: [error] };
  }
  throw error;
}

export default function subscribe(
  schema,
  document,
  rootValue,
  contextValue,
  variableValues,
  operationName,
  fieldResolver,
  subscribeFieldResolver,
) {
  const sourcePromise = createSourceEventStream(
    schema,
    document,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    subscribeFieldResolver,
  );

  const mapSourceToResponse = payload => execute(
    schema,
    document,
    get(payload, ['data'], payload),
    assign({}, contextValue, payload && payload.contextValue),
    variableValues,
    operationName,
    fieldResolver,
  );

  return sourcePromise.then(
    sourceStream => mapAsyncIterator(sourceStream, mapSourceToResponse, reportGraphQLError),
    reportGraphQLError,
  );
}
