import _ from 'lodash';
import { GraphQLInt, GraphQLList } from 'graphql';
import { QueryWithConnection } from 'graphql-tower-queries';
import { pagination } from '../';

describe('afterware', () => {
  it('pagination', async () => {
    const resolve = jest.fn(() => _.range(1, 2000));
    const afterware = jest.fn((payload, args, context, info, results) => results);

    const QueryPagination = class extends QueryWithConnection {
      type = GraphQLInt;
      resolve = resolve;
      afterware = [pagination, afterware];
    };
    const query = new QueryPagination();
    expect(query).toMatchSnapshot();
    expect(query.type).toEqual(new GraphQLList(GraphQLInt));

    afterware.mockClear();
    expect(await query.resolve({}, {})).toEqual(_.range(1, 1001));
    expect(afterware).toHaveBeenCalledTimes(1);

    expect(await query.resolve({}, { first: 100 })).toEqual(_.range(1, 101));
    expect(await query.resolve({}, { offset: 100 })).toEqual(_.range(101, 1101));
    expect(await query.resolve({}, { offset: 100, first: 100 })).toEqual(_.range(101, 201));

    resolve.mockImplementation(() => _.range(1, 2000).map(id => ({ id: `${id}` })));
    expect(await query.resolve({}, { after: '10' })).toEqual(_.range(10, 1010).map(id => ({ id: `${id}` })));
    expect(await query.resolve({}, { after: '120', first: 100 })).toEqual(_.range(120, 220).map(id => ({ id: `${id}` })));

    resolve.mockImplementation(() => _.range(1, 2000).map(cursor => ({ cursor: `${cursor}` })));
    expect(await query.resolve({}, { after: '120', first: 100 })).toEqual(_.range(120, 220).map(cursor => ({ cursor: `${cursor}` })));
  });
});
