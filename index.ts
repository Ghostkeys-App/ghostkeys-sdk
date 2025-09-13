
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