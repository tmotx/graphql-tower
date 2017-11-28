import _ from 'lodash';
import GraphQLField from './GraphQLField';

export default class Subscription extends GraphQLField {
  constructor() {
    super();

    this._.subscribe = _.identity;

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: (resolve) => { this._.resolve = resolve; },
      get: () => this.constructor.resolve.bind(this),
    });

    Object.defineProperty(this, 'subscribe', {
      enumerable: true,
      set: (subscribe) => { this._.subscribe = subscribe; },
      get: () => async (...args) => {
        await this.constructor.middleware.apply(this, args);
        return this._.subscribe.apply(this, args);
      },
    });
  }
}
