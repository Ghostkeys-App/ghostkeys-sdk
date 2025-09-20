# Ghostkeys SDK
* A purpose-built SDK for the Ghostkeys Lean Serial Protocol, optimised for responsiveness and flexibility.
* Structure **encrypted secrets** into any of the provided formats, invoke the corresponding **serialiser**, and send the data to a **vault** for easy ultra-fast syncs.
* Only send the data you need - **only explicitly included data is added, modified, or deleted**.
* Vault-side deserialisers catch byte-errors early, trapping and preventing data corruption.
## Purpose
This SDK offers standard typescript serialisation capabilities compatible with the Ghostkeys streamlined vault backend endpoints.
Vaults offer three data formats:
* **logins**: username/password pairs associated with websites.
* **spreadsheets**: grid-format data storage with obscurable columns.
* **secure notes**: general-purpose labelled secrets storage.

## Installation
Published to `npm`, add to your project with
```shell
npm install @ghostkeys/ghostkeys-sdk
```
Import all types and serialisers with
```js
import {
    serializeSpreadsheet, SpreadsheetMap,
    serializeSpreadsheetColumns, FlexGridColumns,
    serializeLoginsMetadata, LoginsMetadataMap,
    serializeSecureNotes, SecureNotesMap,
    serializeVaultNames, VaultNames,
    serializeGlobalSync,
} from "@ghostkeys/ghostkeys-sdk";
```
# Serialisation Schema 

* The following schema should be used as the basis for implementing encoders in your language of choice.
* All messages are sent as a contiguous vector of big-endian bytes.
* All *data* should be securely encrypted at the client-side before being serialised and sent. *Headers* must be sent in plaintext.
* We strongly recommended that this SDK (or future SDKs for other languages) be used wherever possible.
### Operations
All structures offer the same set of operations:
* **Add**: If data targeting a new index or co-ordinates is received, a cell with that data is implicitly created and stored.
* **Modify**: If data for an existing index or co-ordinate is received, that cell's data is overwritten.
* **Delete**: Sending only a header for an existing index or co-ordinate with 0 bytes of data will delete the data at that index and erase its entry from the vault.

## Data Structures
### Vault Names
* Represented by a key-value pairing of the vault-id principal, and an encrypted associated string. 
* The message format for a single vault is a header followed by the vault principal followed by the encrypted vault name.
#### Header Format

Each vault name entry has a 3-byte header:

| Byte | Property                               |
| ---- | -------------------------------------- |
| 0    | 8-bit *principal size*                 |
| 1    | Upper byte of 16-bit *vault name size* |
| 2    | Lower byte of 16-bit *vault name size* |
#### Message Format:
Each vault is represented by:
```
vector [
	header bytes
	principal bytes
	encrypted name bytes
	... pattern repeats
]
```

### Cells
* Used for sending both *spreadsheet* and *login* information.
* Indexed by `x,y` co-ordinate pairs.

#### Header Format
Each cell entry has a 4 byte header:

| Byte | Property                                                                |
| ---- | ----------------------------------------------------------------------- |
| 1    | Upper byte of 16-bit *size*. For a size of 23,028 this would be `0x59`. |
| 2    | Lower byte of 16-bit *size*. For a size of 23,028 this would be `0xF4`. |
| 3    | 8-bit *x* co-ordinate.                                                  |
| 4    | 8-bit *y* co-ordinate                                                   |
#### Message Format
```
vector [
	header bytes
	encrypted cell data bytes
	... pattern repeats
]
```

#### Size Limitations
The header format imposes the following limits on storage size:
* Encrypted per-cell data length of  $65,025$ bytes.
* Maximum grid size of $255$ by $255$ cells, or $65,025$ total cells.
* Total grid capacity 4GiB.

### Login Metadata
* Logins require additional metadata to associate "grid columns" to specific websites or labels.
#### Header Format
Each login metadata entry has a 3 byte header:

| Byte | Property                                                                |
| ---- | ----------------------------------------------------------------------- |
| 1    | Upper byte of 16-bit *size*. For a size of 23,028 this would be `0x59`. |
| 2    | Lower byte of 16-bit *size*. For a size of 23,028 this would be `0xF4`. |
| 3    | 8-bit *x* co-ordinate.                                                  |

#### Message Format
```
vector [
	header bytes
	encrypted column name bytes
	... pattern repeats
]
```

### Spreadsheet Columns
* Contains metadata about a spreadsheet column's label and whether its data should be obscured.
#### Header Format
| Byte | Property                                                                      |
| ---- | ----------------------------------------------------------------------------- |
| 1    | Upper byte of 16-bit *label size*. For a size of 23,028 this would be `0x59`. |
| 2    | Lower byte of 16-bit *label size*. For a size of 23,028 this would be `0xF4`. |
| 3    | 0x0 if the column should be obscured, 0x1 otherwise                           |
| 4    | 8-bit *x* co-ordinate.                                                        |
#### Message Format
```
vector [
	header bytes
	encrypted column name bytes
	... pattern repeats
]
```
### Secure Notes
* General-purpose containers for secure data.
#### Header Format
| Byte | Property                                                                     |
| ---- | ---------------------------------------------------------------------------- |
| 1    | 8-bit *label size*.                                                          |
| 2    | Upper byte of 16-bit *data size*. For a size of 23,028 this would be `0x59`. |
| 3    | Lower byte of 16-bit *data size*. For a size of 23,028 this would be `0xF4`. |
| 4    | 8-bit *index*                                                                |
#### Message Format
```
vector [
	header bytes
	encrypted note label
	encrypted note data
	... pattern repeats
]
```

### Global Sync
* Avoid multiple unnecessary calls when more than one category has been modified since the last sync by sending all data at once.
#### Header Format
Global sync messages begin with a 15-byte header:

| Byte   | Property                                  |
| ------ | ----------------------------------------- |
| 1..5   | 5-byte length of spreadsheet data         |
| 6..10  | 5-byte length of spreadsheet columns data |
| 11..15 | 5-byte length of secure notes data        |
#### Message Format
```
vector [
	15-byte initial header
	spreadsheet data
	spreadsheet column data
	secure notes data
	5-byte length of logins metadata
	logins metadata
	logins data
]
```

## Examples

* For ease of reading, all data in these examples is in *plaintext*. **Never send plaintext to a vault**.
* Individual entries are divided by newlines for ease of reading.
### Vault Names
Update a vault with principal `abc` and name `Personal`, and a vault with principal `def` and name `Work`:
```
03 00 08 00 61 62 63 50 65 72 73 6F 6E 61 6C
03 00 04 01 64 65 66 57 6F 72 6B
```
### Spreadsheets
Sync a spreadsheet with entries at cells \{0, 2: *the quick brown*}, \{11, 5: *fox jumps over the lazy*} and \{4, 107: *dog*}, while deleting data at cell \{3, 4}:

```
00 0F 00 02 74 68 65 20 71 75 69 63 6B 20 62 72 6F 77 6E 
00 00 03 04
00 17 0B 05 66 6F 78 20 6A 75 6D 70 73 20 6F 76 65 72 20 74 68 65 20 6C 61 7A 79
00 03 04 6B 64 6F 67
```

### Spreadsheet Columns Metadata
Set column 0 to have label "Bank" and column 1 to have label "Card Number", with column 0 revealed and column 1 obscured:
```
00 04 01 00 42 61 6E 6B
00 0B 00 01 43 61 72 64 20 4E 75 6D 62 65 72
```
### Logins Metadata
Set column 0 to have label "Amazon" and column 2 to have label "Google":
```
00 07 00 64 65 66 57 6F 72 6B
00 06 01 47 6F 6F 67 6C 65
```
### Secure Notes
Set note 0 to have label "Wishlist" and content "More ICP cycles", and note 1 to have label "Konami Code" and content "Up Up Down Down Left Right Left Light B A Start"
```
08 00 0F 00 57 69 73 68 6C 69 73 74 4D 6F 72 65 20 49 43 50 20 43 79 63 6C 65 73
0B 00 2F 4B 6F 6E 61 6D 69 20 43 6F 64 65 55 70 20 55 70 20 44 6F 77 6E 20 44 6F 77 6E 20 4C 65 66 74 20 52 69 67 68 74 20 4C 65 66 74 20 4C 69 67 68 74 20 42 20 41 20 53 74 61 72 74
```
