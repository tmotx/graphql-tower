import {
  Model,
  GlobalId,
} from '../';

describe('graphql-tower', () => {
  it('export model', async () => {
    expect(Model.name).toBe('Model');
  });

  it('export global-id', async () => {
    expect(GlobalId.name).toBe('GlobalId');
  });
});
