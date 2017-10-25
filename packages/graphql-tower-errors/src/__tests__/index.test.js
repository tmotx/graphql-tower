import faker from 'faker';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  PaymentRequiredError,
  GoneDataError,
  LockedError,
  ConflictError,
  UnavailableForLegalReasonsError,
} from '../';

describe('error', () => {
  it('ForbiddenError', async () => {
    const message = faker.lorem.sentence();

    expect(() => { throw new ForbiddenError(); }).toThrowError(Error);
    expect(() => { throw new ForbiddenError(); }).toThrowError(ForbiddenError);
    expect(() => { throw new ForbiddenError(message); }).toThrowError(new ForbiddenError(message));
    expect(() => { throw new NotFoundError(); }).not.toThrowError(UnauthorizedError);
  });

  it('NotFoundError', async () => {
    const message = faker.lorem.sentence();

    expect(() => { throw new NotFoundError(); }).toThrowError(Error);
    expect(() => { throw new NotFoundError(); }).toThrowError(NotFoundError);
    expect(() => {
      throw new NotFoundError(message);
    }).toThrowError(new NotFoundError(message));
    expect(() => { throw new NotFoundError(); }).not.toThrowError(ForbiddenError);
  });

  it('UnauthorizedError', async () => {
    const message = faker.lorem.sentence();

    expect(() => { throw new UnauthorizedError(); }).toThrowError(Error);
    expect(() => { throw new UnauthorizedError(); }).toThrowError(UnauthorizedError);
    expect(() => {
      throw new UnauthorizedError(message);
    }).toThrowError(new UnauthorizedError(message));
    expect(() => { throw new UnauthorizedError(); }).not.toThrowError(NotFoundError);
  });

  it('PaymentRequiredError', async () => {
    expect(() => { throw new PaymentRequiredError(); }).toThrowError(Error);
    expect(() => { throw new PaymentRequiredError(); }).toThrowError(PaymentRequiredError);
  });

  it('GoneDataError', async () => {
    expect(() => { throw new GoneDataError(); }).toThrowError(Error);
    expect(() => { throw new GoneDataError(); }).toThrowError(GoneDataError);
  });

  it('LockedError', async () => {
    expect(() => { throw new LockedError(); }).toThrowError(Error);
    expect(() => { throw new LockedError(); }).toThrowError(LockedError);
  });

  it('ConflictError', async () => {
    expect(() => { throw new ConflictError(); }).toThrowError(Error);
    expect(() => { throw new ConflictError(); }).toThrowError(ConflictError);
  });

  it('UnavailableForLegalReasonsError', async () => {
    expect(() => { throw new UnavailableForLegalReasonsError(); })
      .toThrowError(Error);
    expect(() => { throw new UnavailableForLegalReasonsError(); })
      .toThrowError(UnavailableForLegalReasonsError);
  });
});
