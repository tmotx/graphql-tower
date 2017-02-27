class GlobalId {
  constructor(type, id) {
    this.type = type;
    this.id = id;
  }

  getType() {
    return this.type;
  }

  toString() {
    return this.id;
  }
}

module.exports = {
  toGlobalId: (type, id) => (
    new Buffer(`${type}:${id}`, 'utf8').toString('base64')
  ),
  fromGlobalId: (globalId) => {
    const unbased = new Buffer(globalId, 'base64').toString('utf8').split(':');
    return new GlobalId(unbased[0], unbased[1]);
  },
};
