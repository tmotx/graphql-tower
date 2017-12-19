import countries from '../';

describe('countries', () => {
  it('fetch countries', () => {
    expect(countries.length).toBe(242);
    countries.forEach(country => {
      expect(country[0].length).toBe(2);
      expect(country.length).toBe(3);
    });
  });
});
