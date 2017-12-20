import fs from 'fs';
import countries from '../';

describe('countries', () => {
  it('fetch countries', () => {
    expect(countries.length).toBe(243);
    countries.forEach(country => {
      expect(country[0].length).toBe(2);
      expect(country.length).toBe(2);
      expect(fs.existsSync(`${__dirname}/../flags/${country[0]}.svg`)).toBe(true);
    });
  });
});
