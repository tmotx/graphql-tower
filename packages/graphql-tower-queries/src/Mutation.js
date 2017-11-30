import GraphQLField from './GraphQLField';

export default class Mutation extends GraphQLField {
  constructor() {
    super();

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: (resolve) => { this._.resolve = resolve; },
      get: () => {
        const { middleware, resolve } = this.constructor;
        return async (...args) => {
          await middleware.apply(this, args);
          return resolve.apply(this, args);
        };
      },
    });
  }
}
