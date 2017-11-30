import _ from 'lodash';
import faker from 'faker';
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLID, GraphQLInt } from 'graphql';
import { GraphQLField } from '../';

describe('GraphQLField', () => {
  it('snapshot', async () => {
    const field = new GraphQLField();
    expect(field).toMatchSnapshot();
  });

  it('with name', async () => {
    const PropertyNode = class extends GraphQLField {
      name = 'Node';
      inputFields = {};
      outputFields = {};
    };
    const property = new PropertyNode();
    expect(property).toMatchSnapshot();
    expect(_.get(property, 'type.name')).toBe('NodePayload');
    expect(_.get(property, 'args.input.type.ofType.name')).toBe('NodeInput');

    const ClassNameNode = class Node extends GraphQLField {
      inputFields = {};
      outputFields = {};
    };
    const classname = new ClassNameNode();
    expect(classname).toMatchSnapshot();
    expect(_.get(classname, 'type.name')).toBe('NodePayload');
    expect(_.get(classname, 'args.input.type.ofType.name')).toBe('NodeInput');
  });

  it('extends with name', async () => {
    const Node = class extends GraphQLField {
      inputFields = {};
      outputFields = {};
    };

    class Children extends Node {}
    const children = new Children();
    expect(children).toMatchSnapshot();
    expect(_.get(children, 'type.name')).toBe('ChildrenPayload');
    expect(_.get(children, 'args.input.type.ofType.name')).toBe('ChildrenInput');
  });

  it('with input / output fields', async () => {
    const GraphQLNode = class extends GraphQLField {
      inputFields = () => ({
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      });
      outputFields = () => ({
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      });
      resolve = (payload, { input }) => input;
    };

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({ name: 'Query', fields: { node: new GraphQLNode() } }),
    });

    const { data } = await graphql(schema, 'query { node ( input: { id: 10 value: 99 }) { id value } }');
    expect(data).toEqual({ node: { id: '10', value: 99 } });
  });

  it('with middleware', async () => {
    const queue = [];

    const Query = class extends GraphQLField {
      middleware = () => queue.push(1);
    };

    const Children = class extends Query {
      middleware = [
        () => new Promise(done => setImmediate(() => {
          queue.push(2);
          done();
        })),
        () => queue.push(3),
      ];
    };

    const query = new Children();
    await GraphQLField.middleware.call(query);

    expect(queue).toEqual([1, 2, 3]);

    expect(() => {
      class MiddlewareTypeError extends GraphQLField {
        middleware = faker.lorem.word();
      }
      const typeError = new MiddlewareTypeError();
      if (typeError) throw new Error();
    }).toThrowError('middleware a function array is required');
  });

  it('with afterware', async () => {
    const queue = [];

    const Query = class extends GraphQLField {
      afterware = (results) => {
        queue.push(results);
        return 1;
      }
    };

    const Children = class extends Query {
      afterware = [
        results => new Promise(done => setImmediate(() => {
          queue.push(results);
          done(2);
        })),
        (results) => {
          queue.push(results);
          return 3;
        },
      ];
    };

    const query = new Children();
    expect(await GraphQLField.resolve.call(query)).toBe(3);

    expect(queue).toEqual([undefined, 1, 2]);

    expect(() => {
      const AfterwareTypeError = class extends GraphQLField {
        afterware = faker.lorem.word();
      };
      const typeError = new AfterwareTypeError();
      if (typeError) throw new Error();
    }).toThrowError('afterware a function array is required');
  });
});
