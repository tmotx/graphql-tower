import { withFilter } from 'graphql-subscriptions';
import GraphQLField from './GraphQLField';

export default class Subscription extends GraphQLField {
  constructor() {
    super();

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: (resolve) => { this._.resolve = resolve; },
      get: () => this.constructor.resolve.bind(this),
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
