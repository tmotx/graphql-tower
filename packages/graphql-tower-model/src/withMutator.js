import _ from 'lodash';

export default Parent => class Mutator extends Parent {
  get changes() {
    const data = _.omitBy(
      this.valueOf(),
      (value, key) => _.isEqual(this._.previous[key], value),
    );

    return data;
  }

  async sentInsert(operator, tmpData) {
    const values = { ...this.valueOf(), ...tmpData };
    return this.insert(values, operator);
  }

  async sentUpdate(operator, tmpData) {
    const changes = { ...this.changes, ...tmpData };
    return this.update(changes, operator);
  }

  async saveIfNotExists(operator, tempData) {
    const reply = await this.fetch();
    if (reply) return this;
    return this.save(operator, tempData);
  }

  async save(...args) {
    if (this.isNew) return this.sentInsert(...args);
    return this.sentUpdate(...args);
  }

  async insert(values, operator) {
    const { hasTimestamps } = this.constructor;

    const by = this.constructor.checkOperator(operator);

    if (by) {
      _.set(values, ['createdBy'], by);
      _.set(values, ['updatedBy'], by);
    }

    if (hasTimestamps) {
      const at = new Date();
      _.set(values, ['createdAt'], at);
      _.set(values, ['updatedAt'], at);
    }

    return super.insert(values);
  }

  async update(changes, operator) {
    const { hasTimestamps } = this.constructor;

    const by = this.constructor.checkOperator(operator);

    if (_.size(changes) < 1) return this;

    if (by) _.set(changes, ['updatedBy'], by);
    if (hasTimestamps) _.set(changes, ['updatedAt'], new Date());

    return super.update(changes);
  }

  async destroy(operator) {
    const { softDelete } = this.constructor;

    const by = this.constructor.checkOperator(operator);

    if (!softDelete) return super.destroy();

    if (this.valueOf('deletedBy')) return this;

    const data = { deletedAt: new Date() };
    if (by) data.deletedBy = by;

    return super.update(data);
  }
};
