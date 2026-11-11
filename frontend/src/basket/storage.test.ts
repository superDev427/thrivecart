import { describe, expect, it } from 'vitest';
import { parseStoredBasket } from './storage';

describe('parseStoredBasket', () => {
  it('keeps valid items and merges duplicate codes', () => {
    expect(
      parseStoredBasket({
        version: 1,
        items: [
          { code: 'R01', quantity: 1 },
          { code: 'B01', quantity: 3 },
          { code: 'R01', quantity: 2 },
        ],
      }),
    ).toEqual([
      { code: 'R01', quantity: 3 },
      { code: 'B01', quantity: 3 },
    ]);
  });

  it('drops items with invalid codes or quantities', () => {
    expect(
      parseStoredBasket({
        version: 1,
        items: [
          { code: '', quantity: 1 },
          { code: 'R01', quantity: 0 },
          { code: 'G01', quantity: 1.5 },
          { code: 'B01', quantity: '2' },
          { quantity: 2 },
          'R01',
          null,
          { code: 'B01', quantity: 2, unitPriceCents: 1 },
        ],
      }),
    ).toEqual([{ code: 'B01', quantity: 2 }]);
  });

  it.each([null, 'R01', [], { items: [] }, { version: 2, items: [] }, { version: 1, items: {} }])(
    'treats %j as an empty basket',
    (value) => {
      expect(parseStoredBasket(value)).toEqual([]);
    },
  );
});
