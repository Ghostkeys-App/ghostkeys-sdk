import { describe, it, expect } from 'vitest';
import { 
    serializeSpreadsheet, type SpreadsheetMap, 
    serializeLoginsMetadata, type LoginsMetadataMap,
    serializeSecureNotes, type SecureNotesMap,
    serializeGlobalSync,
    type FlexGridColumns,
    serializeSpreadsheetColumns
} from '../../index';

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

describe('serializeLoginsMetadata', () => {
  it('serializes a single entry', () => {
    const map: LoginsMetadataMap = { 5: 'hello' };
    const result = serializeLoginsMetadata(map);

    // 'hello' = 5 bytes
    const expected = new Uint8Array([
      0, 5, // length: 5
      5,    // index
      104, 101, 108, 108, 111 // 'h', 'e', 'l', 'l', 'o'
    ]);
    expect(result).toEqual(expected);
  });

  it('serializes multiple entries', () => {
    const map: LoginsMetadataMap = {
      1: 'A',
      2: 'BC'
    };
    const result = serializeLoginsMetadata(map);

    const expected = new Uint8Array([
      0, 1, 1, 65,      // length:1, index:1, 'A'
      0, 2, 2, 66, 67   // length:2, index:2, 'B','C'
    ]);
    expect(result).toEqual(expected);
  });

  it('handles empty map', () => {
    const map: LoginsMetadataMap = {};
    const result = serializeLoginsMetadata(map);
    expect(result).toEqual(new Uint8Array([]));
  });

  it('handles empty string value', () => {
    const map: LoginsMetadataMap = { 7: '' };
    const result = serializeLoginsMetadata(map);

    const expected = new Uint8Array([
      0, 0, 7 // length:0, index:7, no value data
    ]);
    expect(result).toEqual(expected);
  });
});

describe('serializeSecureNotes', () => {
  it('serializes a single note', () => {
    const map: SecureNotesMap = { 3: { label: 'foo', note: 'bar' } };
    const result = serializeSecureNotes(map);

    // label: 'foo' (3 bytes), note: 'bar' (3 bytes), index: 3
    const expected = new Uint8Array([
      3,        // label length
      0, 3,     // note length (high, low)
      3,        // index
      102, 111, 111, // 'f','o','o'
      98, 97, 114    // 'b','a','r'
    ]);
    expect(result).toEqual(expected);
  });

  it('serializes multiple notes', () => {
    const map: SecureNotesMap = {
      1: { label: 'A', note: 'X' },
      2: { label: 'BC', note: 'YZ' }
    };
    const result = serializeSecureNotes(map);

    const expected = new Uint8Array([
      1, 0, 1, 1, 65, 88,         // label:'A', note:'X', index:1
      2, 0, 2, 2, 66, 67, 89, 90  // label:'BC', note:'YZ', index:2
    ]);
    expect(result).toEqual(expected);
  });

  it('handles empty map', () => {
    const map: SecureNotesMap = {};
    const result = serializeSecureNotes(map);
    expect(result).toEqual(new Uint8Array([]));
  });

  it('handles empty label and note', () => {
    const map: SecureNotesMap = { 5: { label: '', note: '' } };
    const result = serializeSecureNotes(map);

    const expected = new Uint8Array([
      0, 0, 0, 5 // label length:0, note length:0, index:5, no data
    ]);
    expect(result).toEqual(expected);
  });

  it('skips undefined note objects', () => {
    const map: SecureNotesMap = { 1: undefined as any, 2: { label: 'A', note: 'B' } };
    const result = serializeSecureNotes(map);

    const expected = new Uint8Array([
      1, 0, 1, 2, 65, 66 // label:'A', note:'B', index:2
    ]);
    expect(result).toEqual(expected);
  });
});

function encodeSize(size: number): number[] {
    // have to convert to bigint in order to access 5th byte with bitwise operations.
    let lsize : bigint = BigInt(size);
    return [
      Number((lsize >> 32n) & 0xffn),
      Number((lsize >> 24n) & 0xffn),
      Number((lsize >> 16n) & 0xffn),
      Number((lsize >> 8n) & 0xffn),
      Number(lsize & 0xffn),
    ];
}

describe('serializeGlobalSync', () => {
  it('serializes all sections correctly', () => {
    const spreadsheet: SpreadsheetMap = { 1: { 2: 'A' } };
    const columns: FlexGridColumns = { 1: { name: 'name', hidden: false}};
    const secureNotes: SecureNotesMap = { 3: { label: 'foo', note: 'bar' } };
    const loginsMetadata: LoginsMetadataMap = { 4: 'meta' };
    const logins: SpreadsheetMap = { 5: { 6: 'B' } };

    const spreadsheetBytes = serializeSpreadsheet(spreadsheet);
    const columnsBytes = serializeSpreadsheetColumns(columns);
    const secureNotesBytes = serializeSecureNotes(secureNotes);
    const loginsMetadataBytes = serializeLoginsMetadata(loginsMetadata);
    const loginsBytes = serializeSpreadsheet(logins);

    const expected = new Uint8Array([
      ...encodeSize(spreadsheetBytes.length),
      ...encodeSize(columnsBytes.length),
      ...encodeSize(secureNotesBytes.length),
      ...spreadsheetBytes,
      ...columnsBytes,
      ...secureNotesBytes,
      ...encodeSize(loginsMetadataBytes.length),
      ...loginsMetadataBytes,
      ...loginsBytes,
    ]);

    const result = serializeGlobalSync(
      spreadsheet,
      columns,
      secureNotes,
      loginsMetadata,
      logins
    );

    expect(result).toEqual(expected);
  });

  it('handles empty sections', () => {
    const spreadsheet: SpreadsheetMap = {};
    const columns: FlexGridColumns = {};
    const secureNotes: SecureNotesMap = {};
    const loginsMetadata: LoginsMetadataMap = {};
    const logins: SpreadsheetMap = {};

    const expected = new Uint8Array([
      ...encodeSize(0),
      ...encodeSize(0),
      ...encodeSize(0),
      // no spreadsheet bytes
      // no secure notes bytes
      ...encodeSize(0),
      // no logins metadata bytes
      // no logins bytes
    ]);

    const result = serializeGlobalSync(
      spreadsheet,
      columns,
      secureNotes,
      loginsMetadata,
      logins
    );

    expect(result).toEqual(expected);
  });
});