import countries from '../';

describe('countries', () => {
  it('fetch countries', () => {
    expect(countries.length).toBe(44);
    countries.forEach(country => expect(country.length).toBe(3));
  });
});
