import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType } from 'graphql';

function resolveMaybeThunk(thingOrThunk) {
  return typeof thingOrThunk === 'function' ? thingOrThunk() : thingOrThunk;
}

export default function mutation(configs) {
  const { name, inputFields, outputFields, ...otherConfigs } = configs;

  const outputType = new GraphQLObjectType({
    name: `${name}Payload`,
    fields: resolveMaybeThunk(outputFields),
  });

  const inputType = new GraphQLInputObjectType({
    name: `${name}Input`,
    fields: resolveMaybeThunk(inputFields),
  });

  return {
    type: outputType,
    args: {
      input: { type: new GraphQLNonNull(inputType) },
    },
    ...otherConfigs,
  };
}
