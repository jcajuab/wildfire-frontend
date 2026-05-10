export const SUPPORTED_CONTENT_FILE_MIME_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,application/pdf";

export const SUPPORTED_CONTENT_FILE_LABELS = "JPG, PNG, WEBP, GIF, MP4, PDF";

export const CONTENT_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const CONTENT_FILE_MAX_LABEL = "10 MB";

const SUPPORTED_CONTENT_FILE_MIME_TYPE_SET = new Set(
  SUPPORTED_CONTENT_FILE_MIME_TYPES.split(","),
);

export function getContentFileValidationError(file: File): string | null {
  if (!SUPPORTED_CONTENT_FILE_MIME_TYPE_SET.has(file.type)) {
    return `File type is not supported. Use ${SUPPORTED_CONTENT_FILE_LABELS}.`;
  }

  if (file.size > CONTENT_FILE_MAX_BYTES) {
    return `File must be ${CONTENT_FILE_MAX_LABEL} or smaller.`;
  }

  return null;
}
