/**
 * SMRITI MULTIPART PARSER HELPER
 * Works reliably in standalone Express, Vercel Serverless (pre-buffered bodies), and streaming environments.
 */

import busboy from 'busboy';
import { Readable } from 'stream';

export async function parseMultipartRequest(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || req.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return reject(new Error('Content-Type must be multipart/form-data'));
    }

    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
      }
    });

    const fields = {};
    let fileObj = null;

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (name, fileStream, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks = [];

      fileStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      fileStream.on('end', () => {
        fileObj = {
          fieldname: name,
          originalname: filename,
          encoding,
          mimetype: mimeType,
          buffer: Buffer.concat(chunks),
          size: Buffer.concat(chunks).length
        };
      });
    });

    bb.on('close', () => {
      resolve({ fields, file: fileObj });
    });

    bb.on('error', (err) => {
      reject(err);
    });

    // Handle both streaming req and pre-buffered req.body in Vercel
    if (Buffer.isBuffer(req.body)) {
      const stream = Readable.from(req.body);
      stream.pipe(bb);
    } else if (typeof req.body === 'string') {
      const stream = Readable.from(Buffer.from(req.body, 'binary'));
      stream.pipe(bb);
    } else {
      req.pipe(bb);
    }
  });
}
