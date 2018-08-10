import {
  Model,
  GlobalId,
} from '../';

describe('graphql-tower', () => {
  it('export model', async () => {
    expect(Model).not.toBeUndefined();
  });

  it('export global-id', async () => {
    expect(GlobalId).not.toBeUndefined();
  });
});
