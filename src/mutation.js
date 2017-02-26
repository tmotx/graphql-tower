import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType } from 'graphql';

function resolveMaybeThunk(thingOrThunk) {
  return typeof thingOrThunk === 'function' ? thingOrThunk() : thingOrThunk;
}

export default function mutation(config) {
  const { name, inputFields, outputFields, ...otherConfig } = config;

  const outputType = new GraphQLObjectType({
    name: `${name}Payload`,
    fields: resolveMaybeThunk(inputFields),
  });

  const inputType = new GraphQLInputObjectType({
    name: `${name}Input`,
    fields: resolveMaybeThunk(outputFields),
  });

  return {
    type: outputType,
    args: {
      input: { type: new GraphQLNonNull(inputType) },
    },
    ...otherConfig,
  };
}
