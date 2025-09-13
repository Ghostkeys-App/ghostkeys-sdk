# Ghostkeys SDK

## Introduction
This SDK offers standard typescript serialisation capabilities compatible with the Ghostkeys streamlined vault backend endpoints. Invoke a function with the corresponding data to generate an array of bytes, then send that directly to the canister endpoint for ultra-fast syncs.

A vault stores three types of data: *logins*, *secure notes* and a *spreadsheet*. *Logins* and *spreadsheets* are represented by a two dimensional *grid* composed of *cells* which have *co-ordinates* and *data*. *Secure Notes* are represented by a 1-dimensional array. 

This schema lays out the most efficient way of communicating this data to a vault canister, and should be used as the basis for implementing encoders. 

All *data* should be securely encrypted at the client-side before being serialised and sent. *Headers* must be sent in plaintext.

It is strongly recommended that this SDK (or future SDKs for other languages) be used wherever possible, however should the need arise to write a custom serialiser for your language of choice, and for the purposes of transparency, the serialisation format is described in detail below:

# Serialisation Schema

## Cells
Cells are common for both *spreadsheet* and *login data* messages, so are described first.
Each cell has the following properties:
- The *size* of the encrypted *data*
- An *x* co-ordinate,
- A *y* co-ordinate,
- *Size* bytes of encrypted *data*.
The first three properties are stored in a fixed-size *header* composed of four bytes:

| Byte | Property                                                                |
| ---- | ----------------------------------------------------------------------- |
| 1    | Upper byte of 16-bit *size*. For a size of 23,028 this would be `0x59`. |
| 2    | Lower byte of 16-bit *size*. For a size of 23,028 this would be `0xF4`. |
| 3    | 8-bit *x* co-ordinate.                                                  |
| 4    | 8-bit *y* co-ordinate                                                   |
The following *size* bytes represent the *data*.

### Cell Operations
Cells can be *added*, *modified*, or *deleted*. *Add* and *modify* operations are equivalent and are performed by sending the new or updated *data* pre-pended with the header. *Delete* operations are performed by sending the *header* with a *size* of 0 and no *data*.
### Limitations
This limits each cell to an encrypted data length of $65,025$ bytes. It limits the maximum size of the *grid* to $255$ by $255$ cells, or $65,025$ total cells. This gives the *grid* a maximum capacity of 4GiB. The *header* overhead for sending data for every cell at once is $260,100$ bytes, or slightly more than 254KiB.

## Spreadsheets
Spreadsheets are represented by a contiguous vector of bytes representing a series of *cells*. No delimiters or other characters are necessary as the *size* field of the *header* allows the deserializer to extract and store the *data*. The *co-ordinates* are stored alongside each *cell* so that the data can be accurately represented in the UI's spreadsheet. 
### Endpoints
Spreadsheets can perform the following operations: a sync, and a delete-only.
#### Sync
The sync endpoint accepts information for changed or deleted cells.

For example, to sync a spreadsheet with entries at cells \{0, 2: *the quick brown*}, \{11, 5: *fox jumps over the lazy*} and \{4, 107: *dog*}, while deleting any data at cell \{3, 4}, the following bytes would be sent (for demonstration's sake, let's pretend that these represent the encrypted data of the cell, not the plaintext):

```
00 0F 00 02 74 68 65 20 71 75 69 63 6B 20 62 72 6F 77 6E 00 00 03 04 00 17 0B 05 66 6F 78 20 6A 75 6D 70 73 20 6F 76 65 72 20 74 68 65 20 6C 61 7A 79 00 03 04 6B 64 6F 67
```

Adding newlines to make it clearer where the cells are:
```
00 0F 00 02 74 68 65 20 71 75 69 63 6B 20 62 72 6F 77 6E 
00 00 03 04
00 17 0B 05 66 6F 78 20 6A 75 6D 70 73 20 6F 76 65 72 20 74 68 65 20 6C 61 7A 79
00 03 04 6B 64 6F 67
```

#### Delete
This endpoint is provided for optimisation purposes. It is faster to process when the vault knows data will only be deleted, and the payload can be significantly shortened as a result. 

The delete endpoint accepts only a contiguous sequence of *co-ordinate* pairs corresponding to bytes 3 and 4 of a standard header. For example, to delete the information in cells {0,2}, {11,5}, and {4,107} using a delete call, the client should send:
```
00 02 0B 05 04 6B
```

With newlines for clarity:
```
00 02 
0B 05 
04 6B
```

## Logins
Logins, too, are represented by a 2D array. It is assumed that the username and password are encoded and encrypted in the *data*, and that the only distinguishing factors are enumerating the *target* websites and the individual *identities* for each *target*. *Targets* are indexed by the *x co-ordinate*. *Identities* are indexed by the *y co-ordinate*. Additionally, logins must store *metadata* which the UI can use to map *target* indexes to *target* names.

### Metadata
Login *metadata* has the following properties:
- An *x co-ordinate* corresponding to a column in the grid,
- The *size* of the encrypted *name*.
- *Size* bytes representing the encrypted *name*.
The *x co-ordinate* and *size* are encoded as a two-byte header:

| Byte | Property                                                                |
| ---- | ----------------------------------------------------------------------- |
| 1    | Upper byte of 16-bit *size*. For a size of 23,028 this would be `0x59`. |
| 2    | Lower byte of 16-bit *size*. For a size of 23,028 this would be `0xF4`. |
| 3    | 8-bit *x co-ordinate*                                                   |
The maximum length of a URL is $2048$ characters, requiring 11 bits to represent, so 2 bytes are necessary to accommodate any URL.

Following the *header* are *size* bytes of encrypted data.

### Endpoints
Logins can perform the following operations:
- Full sync including *metadata* and *logins*
- *Metadata* sync
- *Metadata deletion* - note this implicitly clears all *logins* corresponding to the deleted columns.
- *Logins* sync
- *Logins* deletion
#### Full Sync
A full sync must encode both *metadata* and *logins*. *Logins* are serialised in the same manner as spreadsheet data. In order to denote the boundary between *metadata* and *login* information, a ten byte header is prepended to the message:

| Byte  | Property                           |
| ----- | ---------------------------------- |
| 1..5  | Size of the *metadata* information |

Only the size of the *metadata* needs to be specified, as the remaining size of the message can implicitly be assumed to be the *logins* information.

The full message then follows the format:
```
01 02 03 04 05    -5 byte size of the metadata information

01 02 03 [...]    -The first metadata entry with 3 byte header
...               -Following metadata entries

01 02 03 04 [...] -The first login entry with 4 byte header
...               -The rest of the login entries
```


#### Metadata sync
This is identical to a spreadsheet sync, except the above specified 3 byte header is used for each entry.
#### Metadata deletion
This is performed by sending a sequence of 1-byte *x co-ordinates* corresponding to the columns targeted for deletion.
Note that this will **implicitly delete all logins in the targeted columns**.
#### Login sync
This is identical to a spreadsheet sync.
#### Login deletion
This is identical to a spreadsheet deletion.

## Secure Notes
Secure notes are represented as a 1-dimensional array of entries indexed by a numerical *x co-ordinate*. Each entry contains a *label* and a *value*. 

Each secure note has a header, followed by *label size* bytes of encrypted label data and then *note size* bytes of encrypted note data. The header has the format:

| Byte | Property                         |
| ---- | -------------------------------- |
| 0    | 8-bit *label size*               |
| 1    | Upper byte of 16-bit *note size* |
| 2    | Lower byte of 16-bit *note size* |
| 3    | 8-bit *x co-ordinate*            |

## Global Sync
Users may have modified both logins and spreadsheets before syncing their vaults. To reduce the canister ingress call fees an additional endpoint is offered which syncs both the spreadsheet and logins in a single call. This takes the form of a contiguous vector of bytes composed of a *global sync header* followed by a **Sync** format message for the spreadsheet, then a **Full Sync** format message for the logins.

The *global sync header* contains the following information:
- The *size* of the *spreadsheet* portion of the message as a 5-byte number.
- The *size* of the *secret notes* portion of the message as a 5-byte number.
The *size* of the spreadsheet does not need to be included as it can be derived from the *size* of the *global sync header* and the *size* of the *logins* portion of the message, against the total size of the message.

The full message, of length `$TOTAL_SIZE` follows the format:
```
01 02 03 04 05 -Size of the spreadsheet portion $SS_SIZE
06 07 08 09 0a -Size of the secret notes portion $SN_SIZE

...            -$SS_SIZE bytes of spreadsheet data

...            -$SN_SIZE bytes of secret notes data

01 02 03 04 05 -Size of the login metadata data $META_SIZE
...            -$L_META bytes of metadata data
...            -'$TOTAL_SIZE - $META_SIZE - SS_SIZE - $SN_SIZE - 10' bytes of logins data
```

15 bytes are subtracted from the last segment to account for the 15 bytes representing `$SS_SIZE` and `$SN_SIZE` at the start, and the 5 bytes representing `$META_SIZE`.