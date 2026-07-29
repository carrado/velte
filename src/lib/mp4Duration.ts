// Best-effort, container-level video duration — reads ONLY the MP4/MOV
// (ISO base media file format) box structure directly from the file's raw
// bytes, never asking the browser to decode a single video frame. This is
// what makes it work even when <video preload="metadata"> can't: a phone
// recording in a codec the browser's decoder doesn't support (HEVC on a lot
// of Android Chrome/WebView builds) still has its container metadata in
// this same well-documented binary format regardless of what's inside it.
//
// MP4/MOV share the same box format: [4-byte size][4-byte type][payload],
// recursively nested. The duration lives in `moov/mvhd`. `moov` can sit
// anywhere in the file — at the start ("fast start", web-optimized) or at
// the end (common for raw, unprocessed phone recordings) — so this walks
// top-level boxes from byte 0, using each box's own declared SIZE to jump
// straight to the next one. That means the (often huge) `mdat` box, which
// holds the actual audio/video data and is typically ~99% of the file, is
// SKIPPED by jumping its declared size rather than read — this only ever
// pulls a handful of small chunks (box headers, a few bytes each, plus the
// tiny mvhd payload) off disk via Blob.slice(), regardless of whether the
// file is 5MB or 2GB.

async function readUint32(file: File, offset: number): Promise<number> {
  const buf = await file.slice(offset, offset + 4).arrayBuffer();
  if (buf.byteLength < 4) throw new Error("truncated");
  return new DataView(buf).getUint32(0);
}

async function readBoxType(file: File, offset: number): Promise<string> {
  const buf = await file.slice(offset, offset + 4).arrayBuffer();
  if (buf.byteLength < 4) throw new Error("truncated");
  return String.fromCharCode(...new Uint8Array(buf));
}

async function readBigUint64(file: File, offset: number): Promise<bigint> {
  const buf = await file.slice(offset, offset + 8).arrayBuffer();
  if (buf.byteLength < 8) throw new Error("truncated");
  return new DataView(buf).getBigUint64(0);
}

interface BoxLocation {
  /** Byte offset where this box's PAYLOAD starts (i.e. past its header). */
  offset: number;
  /** Payload length, excluding the header. */
  size: number;
}

// Walks sibling boxes in [start, end) looking for `targetType`, jumping
// forward by each box's own declared size rather than reading its content
// — the only way this stays cheap regardless of how large intervening
// boxes (like `mdat`) are.
async function findBox(
  file: File,
  targetType: string,
  start: number,
  end: number,
): Promise<BoxLocation | null> {
  let offset = start;
  // A malformed/adversarial file with a zero-size loop shouldn't hang this
  // — every real box is at least 8 bytes, so a well-formed file always
  // makes forward progress; this is just a hard backstop.
  while (offset + 8 <= end) {
    const size32 = await readUint32(file, offset);
    const type = await readBoxType(file, offset + 4);

    let boxSize: number;
    let headerSize = 8;
    if (size32 === 1) {
      // 64-bit "largesize" extension — only relevant for boxes >4GB, which
      // nothing here produces at this app's upload cap, but a real MP4
      // parser has to at least recognize the header shape to keep walking
      // correctly past one if a source file happens to use it.
      boxSize = Number(await readBigUint64(file, offset + 8));
      headerSize = 16;
    } else if (size32 === 0) {
      // "Box extends to end of file" — only ever the LAST box in a stream.
      boxSize = end - offset;
    } else {
      boxSize = size32;
    }
    if (boxSize < headerSize) return null; // malformed — bail out safely

    if (type === targetType) {
      return { offset: offset + headerSize, size: boxSize - headerSize };
    }
    offset += boxSize;
  }
  return null;
}

// `mvhd` (movie header) layout after its own 4-byte full-box header
// (1 version byte + 3 flag bytes): version 0 uses 32-bit
// creation/modification/duration timestamps, version 1 uses 64-bit ones —
// same fields, different widths, so the duration/timescale offsets shift.
async function readMvhdDurationS(
  file: File,
  mvhdOffset: number,
): Promise<number | null> {
  const versionByte = new DataView(
    await file.slice(mvhdOffset, mvhdOffset + 1).arrayBuffer(),
  ).getUint8(0);

  if (versionByte === 1) {
    // version(1) + flags(3) + creation(8) + modification(8) = 20 bytes in,
    // then timescale(4) + duration(8).
    const buf = await file
      .slice(mvhdOffset + 20, mvhdOffset + 32)
      .arrayBuffer();
    if (buf.byteLength < 12) return null;
    const view = new DataView(buf);
    const timescale = view.getUint32(0);
    const duration = view.getBigUint64(4);
    return timescale > 0 ? Number(duration) / timescale : null;
  }

  // version(1) + flags(3) + creation(4) + modification(4) = 12 bytes in,
  // then timescale(4) + duration(4).
  const buf = await file.slice(mvhdOffset + 12, mvhdOffset + 20).arrayBuffer();
  if (buf.byteLength < 8) return null;
  const view = new DataView(buf);
  const timescale = view.getUint32(0);
  const duration = view.getUint32(4);
  return timescale > 0 ? duration / timescale : null;
}

// Returns the video's duration in seconds, or null on anything unexpected
// (not an MP4/MOV-family container, fragmented/streamed file with no single
// mvhd duration, truncated/corrupt data, parse error). This is a best-effort
// enhancement layered on top of the real <video>-element check
// (bunnyStream.ts's checkVideoDuration) — never something that should throw
// or block a vendor's upload on its own.
export async function parseMp4Duration(file: File): Promise<number | null> {
  try {
    const moov = await findBox(file, "moov", 0, file.size);
    if (!moov) return null;
    const mvhd = await findBox(
      file,
      "mvhd",
      moov.offset,
      moov.offset + moov.size,
    );
    if (!mvhd) return null;
    return await readMvhdDurationS(file, mvhd.offset);
  } catch {
    return null;
  }
}
