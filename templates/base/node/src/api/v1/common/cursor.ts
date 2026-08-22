import { badRequestError } from "../../../core/errors.js";

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({
      c: createdAt.toISOString(),
      i: id,
    })
  ).toString("base64url");
}

export function decodeCursor(cursor: string): {
  createdAt: Date;
  id: string;
} {
  try {
    const raw = Buffer.from(cursor, "base64url").toString();
    const parsed = JSON.parse(raw) as {
      c: string;
      i: string;
    };
    return {
      createdAt: new Date(parsed.c),
      id: parsed.i,
    };
  } catch {
    throw badRequestError("Invalid cursor.");
  }
}

export function encodeNullableCursor(timestamp: Date | null, id: string): string {
  return Buffer.from(
    JSON.stringify({
      t: timestamp ? timestamp.toISOString() : null,
      i: id,
    })
  ).toString("base64url");
}

export function decodeNullableCursor(cursor: string): {
  timestamp: Date | null;
  id: string;
} {
  try {
    const raw = Buffer.from(cursor, "base64url").toString();
    const parsed = JSON.parse(raw) as {
      t: string | null;
      i: string;
    };
    return {
      timestamp: parsed.t ? new Date(parsed.t) : null,
      id: parsed.i,
    };
  } catch {
    throw badRequestError("Invalid cursor.");
  }
}
