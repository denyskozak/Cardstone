import { describe, expect, it } from 'vitest';
import { sanitizeAttachmentName } from './download.js';

describe('sanitizeAttachmentName', () => {
  it('removes control characters and dangerous symbols', () => {
    const { safeName, headerValue } = sanitizeAttachmentName('My\r\nDeck/"Name"', 'json');
    expect(safeName).toBe('My Deck Name.json');
    expect(headerValue).toContain('attachment;');
    expect(headerValue.includes('\n')).toBe(false);
    expect(headerValue.includes('\r')).toBe(false);
  });

  it('falls back to a default name when empty', () => {
    const { safeName, headerValue } = sanitizeAttachmentName('', '.txt');
    expect(safeName).toBe('file.txt');
    expect(headerValue).toContain('file.txt');
  });

  it('encodes unicode characters safely', () => {
    const { headerValue } = sanitizeAttachmentName('Привет мир', 'pdf');
    expect(headerValue).toContain("filename*=UTF-8''%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%BC%D0%B8%D1%80.pdf");
  });
});
