import { assertResult } from 'graphql-tower-helper';

export default Parent => class Fetcher extends Parent {
  async fetch(error) {
    this.limit(1);
    const results = await this.find();

    assertResult(results[0], error);
    return results[0] ? this.forge(results[0]) : null;
  }

  async fetchOrSave(operator, tempData) {
    return await this.fetch() || this.save(operator, tempData);
  }

  async fetchAll(error) {
    this.limit(1000);

    const results = await this.find();

    assertResult(results.length, error);
    return results;
  }

  async fetchPage({ offset, first } = {}, error) {
    if (offset) this.offset(offset);
    if (first) this.limit(first);
    return this.fetchAll(error);
  }

  async fetchCount(error) {
    const results = await this.query.count('*');
    const count = parseInt(results[0].count, 10);
    assertResult(count, error);
    return count;
  }
};
