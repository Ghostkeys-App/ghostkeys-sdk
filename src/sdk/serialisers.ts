export type VaultNames = Array<{ vault_id: Uint8Array, vault_name: string }>;

export function serializeVaultNames(names: VaultNames) : Uint8Array {
  const chunks: number[] = [];
  
  for ( const x in names ) {
    if (!names[x]) continue;

    const vault_id = names[x].vault_id;
    const vault_name = names[x].vault_name;
    const name = new TextEncoder().encode(vault_name);
    const id_len = vault_id.length;
    const name_len = name.length;

    chunks.push(id_len & 0xff);
    chunks.push((name_len >> 8) & 0xff);
    chunks.push(name_len & 0xff);
    chunks.push(...vault_id);
    chunks.push(...name);
  }

  return new Uint8Array(chunks);
}

export type FlexGridColumns = { [x: number]: { name: string, hidden: boolean }};

export function serializeSpreadsheetColumns(map: FlexGridColumns) : Uint8Array {
  const chunks: number[] = [];

  for ( const entry in map ) {
    const x = Number(entry);
    const column = map[x];
    const name = column?.name || "";
    const nameBytes = new TextEncoder().encode(name);
    const len = name.length;
    const hidden = column?.hidden || false;

    chunks.push((len >> 8) & 0xff);
    chunks.push(len & 0xff);
    chunks.push(hidden ? 0x0 : 0x1);
    chunks.push(x & 0xff);

    chunks.push(...nameBytes);
  }

  return new Uint8Array(chunks);
}

export type SpreadsheetMap = { [x: number]: { [y: number]: string } };

export function serializeSpreadsheet(map: SpreadsheetMap): Uint8Array {
    const chunks: number[] = [];

    for (const xStr in map) {
        const x = Number(xStr);
        const row = map[x];
        for (const yStr in row) {
            const y = Number(yStr);
            const cellData = row[y];
            const cellBytes = new TextEncoder().encode(cellData);
            const len = cellBytes.length;

            // Header: 2 bytes for length, 1 byte for x, 1 byte for y
            chunks.push((len >> 8) & 0xff); // length high byte
            chunks.push(len & 0xff);        // length low byte
            chunks.push(x & 0xff);          // x coordinate
            chunks.push(y & 0xff);          // y coordinate

            // Cell data
            chunks.push(...cellBytes);
        }
    }

    return new Uint8Array(chunks);
}

export type LoginsMetadataMap = { [index: number]: string };

export function serializeLoginsMetadata(map: LoginsMetadataMap): Uint8Array {
    const chunks: number[] = [];

    for (const indexStr in map) {
        const index = Number(indexStr);
        const value = map[index];
        const valueBytes = new TextEncoder().encode(value);
        const len = valueBytes.length;

        // Header: 2 bytes for length, 1 byte for index
        chunks.push((len >> 8) & 0xff); // length high byte
        chunks.push(len & 0xff);        // length low byte
        chunks.push(index & 0xff);      // index

        // Value data
        chunks.push(...valueBytes);
    }

    return new Uint8Array(chunks);
}

export type LoginsMap = { [x: number]: { name: string, entries: { [y: number]: { username: string, password: string }}}};

export function serializeLogins(map: LoginsMap) {
  const chunks : number[] = [];

  for ( const x in map ) {
    const ind_x = Number(x);
    for ( const y in map ) {
      const ind_y = Number(y);
      const usernameBytes = new TextEncoder().encode(map[x]?.entries[y]?.username || "");
      const passwordBytes = new TextEncoder().encode(map[x]?.entries[y]?.password || "");

      const unameLen = usernameBytes.length;
      const passwordLen = passwordBytes.length;

      chunks.push(ind_x & 0xff);
      chunks.push(ind_y & 0xff);
      chunks.push ((unameLen >> 8) & 0xff);
      chunks.push(unameLen & 0xff);
      chunks.push((passwordLen >> 8) & 0xff);
      chunks.push(passwordLen & 0xff);

      chunks.push(...usernameBytes);
      chunks.push(...passwordBytes);
    }
  }

  return new Uint8Array(chunks);
}

export type SecureNotesMap = { [index: number]: { label: string, note: string } };

export function serializeSecureNotes(map: SecureNotesMap): Uint8Array {
    const chunks: number[] = [];

    for (const indexStr in map) {
        const index = Number(indexStr);
        const noteObj = map[index];
        if (!noteObj) continue;
        
        const { label, note } = noteObj;

        const labelBytes = new TextEncoder().encode(label);
        const labelLen = labelBytes.length;

        const noteBytes = new TextEncoder().encode(note);
        const noteLen = noteBytes.length;

        // Header: 1 byte for label length, 2 bytes for note length, 1 byte for index
        chunks.push(labelLen & 0xff);       // label length (assuming label < 256 bytes)
        chunks.push((noteLen >> 8) & 0xff); // note length high byte
        chunks.push(noteLen & 0xff);        // note length low byte
        chunks.push(index & 0xff);          // index

        // Label data
        chunks.push(...labelBytes);

        // Note data
        chunks.push(...noteBytes);
    }

    return new Uint8Array(chunks);
}

/**
 * Serializes all vault data for a global sync.
 * Format:
 * [5 bytes spreadsheet size][5 bytes secure notes size]
 * [spreadsheet bytes][secure notes bytes]
 * [5 bytes login metadata size][login metadata bytes][login bytes]
 */
export function serializeGlobalSync(
  spreadsheet: SpreadsheetMap,
  columns: FlexGridColumns,
  secureNotes: SecureNotesMap,
  loginsMetadata: LoginsMetadataMap,
  logins: SpreadsheetMap
): Uint8Array {
  // Serialize each section
  const spreadsheetBytes = serializeSpreadsheet(spreadsheet);
  const columnsBytes = serializeSpreadsheetColumns(columns);
  const secureNotesBytes = serializeSecureNotes(secureNotes);
  const loginsMetadataBytes = serializeLoginsMetadata(loginsMetadata);
  const loginsBytes = serializeSpreadsheet(logins);

  // Sizes
  const spreadsheetSize     = spreadsheetBytes.length;
  const columnsSize         = columnsBytes.length;
  const secureNotesSize     = secureNotesBytes.length;
  const loginsMetadataSize  = loginsMetadataBytes.length;

  // 5-byte big-endian size helper
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

  // Compose final byte array
  const totalLength =
    5 + // spreadsheet size header
    5 + // columns size header
    5 + // secure notes size header
    spreadsheetBytes.length +
    columnsBytes.length +
    secureNotesBytes.length +
    5 + // logins metadata size header
    loginsMetadataBytes.length +
    loginsBytes.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;

  // Spreadsheet size header
  result.set(encodeSize(spreadsheetSize), offset);
  offset += 5;

  // Columns size header
  result.set(encodeSize(columnsSize), offset);
  offset += 5;

  // Secure notes size header
  result.set(encodeSize(secureNotesSize), offset);
  offset += 5;

  // Spreadsheet bytes
  result.set(spreadsheetBytes, offset);
  offset += spreadsheetBytes.length;

  // Columns bytes
  result.set(columnsBytes, offset);
  offset += columnsBytes.length;

  // Secure notes bytes
  result.set(secureNotesBytes, offset);
  offset += secureNotesBytes.length;

  // Logins metadata size header
  result.set(encodeSize(loginsMetadataSize), offset);
  offset += 5;

  // Logins metadata bytes
  result.set(loginsMetadataBytes, offset);
  offset += loginsMetadataBytes.length;

  // Logins bytes
  result.set(loginsBytes, offset);

  return result;
}