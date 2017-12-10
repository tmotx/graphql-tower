import { $$asyncIterator } from 'iterall';
import assign from 'lodash/assign';
import GraphQLField from './GraphQLField';

export function withFilter(asyncIteratorFn, filterFn) {
  return (rootValue, args, context, info) => {
    const asyncIterator = asyncIteratorFn(rootValue, args, context, info);

    const getNextPromise = () => asyncIterator
      .next()
      .then(payload => Promise.all([
        payload,
        Promise.resolve(
          filterFn(payload.value, args, assign({}, context, payload.value._), info),
        ).catch(() => false),
      ]))
      .then(([payload, filterResult]) => {
        if (filterResult === true || payload.done === true) {
          return payload;
        }

        // Skip the current value and wait for the next one
        return getNextPromise();
      });

    return {
      next() {
        return getNextPromise();
      },
      return() {
        return asyncIterator.return();
      },
      throw(error) {
        return asyncIterator.throw(error);
      },
      [$$asyncIterator]() {
        return this;
      },
    };
  };
}

export default class Subscription extends GraphQLField {
  constructor() {
    super();

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: (resolve) => { this._.resolve = resolve; },
      get: () => (rootValue, args, context, info) => this.constructor.resolve.call(
        this, rootValue, args, assign({}, context, rootValue._), info,
      ),
    });

    Object.defineProperty(this, 'subscribe', {
      enumerable: true,
      set: (subscribe) => { this._.subscribe = subscribe; },
      get: () => withFilter(
        this._.subscribe.bind(this),
        this.constructor.middleware.bind(this),
      ),
    });
  }
}
