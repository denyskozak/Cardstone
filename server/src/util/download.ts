const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]+/g;
const FORBIDDEN_FILE_CHARS = /[\\/\r\n\t\f\v\0"'<>:|?*]+/g;
const WHITESPACE_REGEX = /\s+/g;

function ensureExtension(ext?: string): string {
  if (!ext) return '';
  const cleaned = ext.replace(/^\.+/, '').trim();
  return cleaned ? `.${cleaned}` : '';
}

export function sanitizeAttachmentName(rawName: string | undefined, extension?: string): {
  safeName: string;
  headerValue: string;
} {
  const ext = ensureExtension(extension);
  const baseName = (rawName ?? '').replace(CONTROL_CHARS_REGEX, ' ');
  const cleaned = baseName.replace(FORBIDDEN_FILE_CHARS, ' ').replace(WHITESPACE_REGEX, ' ').trim();
  const fallback = 'file';
  const normalizedBase = cleaned || fallback;
  const combined = `${normalizedBase}${ext}`;
  const asciiName = combined.replace(/[^\x20-\x7E]/g, '_');
  const safeAscii = asciiName.replace(WHITESPACE_REGEX, '_') || `${fallback}${ext}`;
  const encoded = encodeURIComponent(combined);
  const headerValue = `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
  return {
    safeName: combined,
    headerValue
  };
}
