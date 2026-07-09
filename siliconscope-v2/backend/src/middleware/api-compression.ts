import type { NextFunction, Request, Response } from "express";
import { brotliCompress, gzip } from "node:zlib";

const MIN_COMPRESS_BYTES = 1024;
const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;

function acceptsEncoding(req: Request) {
  const header = String(req.headers["accept-encoding"] || "");
  if (header.includes("br")) return "br";
  if (header.includes("gzip")) return "gzip";
  return null;
}

function isCompressible(res: Response) {
  const contentType = String(res.getHeader("content-type") || "").toLowerCase();
  return /^(application\/json|application\/.*\+json|text\/)/.test(contentType);
}

function appendVary(res: Response) {
  const current = String(res.getHeader("vary") || "");
  if (/\baccept-encoding\b/i.test(current)) return;
  res.setHeader("vary", current ? `${current}, Accept-Encoding` : "Accept-Encoding");
}

export function apiCompression(req: Request, res: Response, next: NextFunction) {
  const encoding = acceptsEncoding(req);
  if (!encoding || req.method === "HEAD") {
    next();
    return;
  }

  const chunks: Buffer[] = [];
  let bufferedBytes = 0;
  let passthrough = false;
  const originalWrite = res.write.bind(res) as Response["write"];
  const originalEnd = res.end.bind(res) as Response["end"];
  const originalWriteAny = originalWrite as (...args: any[]) => boolean;
  const originalEndAny = originalEnd as (...args: any[]) => Response;

  res.write = ((chunk: unknown, encodingOrCallback?: BufferEncoding | ((err?: Error) => void), callback?: (err?: Error) => void) => {
    if (passthrough) return originalWriteAny(chunk, encodingOrCallback, callback);
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), typeof encodingOrCallback === "string" ? encodingOrCallback : undefined);
    bufferedBytes += buffer.length;
    if (bufferedBytes > MAX_BUFFERED_BYTES) {
      passthrough = true;
      for (const queued of chunks) originalWriteAny(queued);
      chunks.length = 0;
      return originalWriteAny(buffer, typeof encodingOrCallback === "function" ? encodingOrCallback : callback);
    }
    chunks.push(buffer);
    if (typeof encodingOrCallback === "function") encodingOrCallback();
    if (callback) callback();
    return true;
  }) as Response["write"];

  res.end = ((chunk?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) => {
    const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (chunk) (res.write as (...args: any[]) => boolean)(chunk, typeof encodingOrCallback === "string" ? encodingOrCallback : undefined);
    if (
      passthrough ||
      bufferedBytes < MIN_COMPRESS_BYTES ||
      res.statusCode === 204 ||
      res.statusCode === 304 ||
      res.getHeader("content-encoding") ||
      !isCompressible(res)
    ) {
      originalEndAny(Buffer.concat(chunks), done);
      return res;
    }

    const body = Buffer.concat(chunks);
    const compress = encoding === "br" ? brotliCompress : gzip;
    compress(body, (err, compressed) => {
      if (err) {
        originalEndAny(body, done);
        return;
      }
      appendVary(res);
      res.setHeader("content-encoding", encoding);
      res.removeHeader("content-length");
      originalEndAny(compressed, done);
    });
    return res;
  }) as Response["end"];

  next();
}
