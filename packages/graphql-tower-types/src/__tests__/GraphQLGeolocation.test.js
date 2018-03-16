import _ from 'lodash';
import faker from 'faker';
import { GraphQLError } from 'graphql';
import { GraphQLGeolocation } from '../index';
import expectGraphql from './index';

describe('GraphQLGeolocation', () => {
  it('successfully query', async () => {
    const accuracy = parseInt(faker.random.number(), 10);
    const latitude = parseFloat(faker.address.latitude());
    const longitude = parseFloat(faker.address.longitude());
    const value = { accuracy, latitude, longitude };

    await _.reduce([{
      value: JSON.stringify(value),
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${JSON.stringify(value).replace(/"/g, '\\"')}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Geolocation", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Geolocation) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Geolocation) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Geolocation", found "XYZ": Geolocation cannot represent non value: XYZ')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Geolocation) { value (input: $input) }',
      args: { input: { accuracy, latitude } },
      result: { errors: [new TypeError(`Variable "$input" got invalid value {"accuracy":${accuracy},"latitude":${latitude}}.\nExpected type "Geolocation", found {"accuracy":${accuracy},"latitude":${latitude}}: Geolocation.longitude cannot represent non value: undefined`)] },
      calledTimes: 0,
    }], expectGraphql(GraphQLGeolocation), Promise.resolve());
  });
});
