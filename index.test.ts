import { describe, it, expect } from 'vitest';
import { serializeSpreadsheet, type SpreadsheetMap } from './index';

describe('serializeSpreadsheet', () => {
  it('serializes a single cell', () => {
    const map: SpreadsheetMap = { 1: { 2: 'abc' } };
    const result = serializeSpreadsheet(map);

    // Header: [len high, len low, x, y] + cell bytes
    // 'abc' = 3 bytes
    const expected = new Uint8Array([
      0, 3, // length: 3
      1,    // x
      2,    // y
      97, 98, 99 // 'a', 'b', 'c'
    ]);
    expect(result).toEqual(expected);
  });

  it('serializes multiple cells', () => {
    const map: SpreadsheetMap = {
      0: { 0: 'A' },
      1: { 1: 'B' }
    };
    const result = serializeSpreadsheet(map);

    const expected = new Uint8Array([
      0, 1, 0, 0, 65, // 'A'
      0, 1, 1, 1, 66  // 'B'
    ]);
    expect(result).toEqual(expected);
  });

  it('handles empty map', () => {
    const map: SpreadsheetMap = {};
    const result = serializeSpreadsheet(map);
    expect(result).toEqual(new Uint8Array([]));
  });

  it('handles empty string cell', () => {
    const map: SpreadsheetMap = { 5: { 6: '' } };
    const result = serializeSpreadsheet(map);

    const expected = new Uint8Array([
      0, 0, 5, 6 // length: 0, x:5, y:6, no cell data
    ]);
    expect(result).toEqual(expected);
  });
});