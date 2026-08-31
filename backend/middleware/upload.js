/* ============================================================
   VENDHAN CRACKERS — Image Upload Middleware
   ============================================================ */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

/* ---------- Upload directory ---------- */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/* Allowed image MIME types and their safe extensions */
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

/* Ensure upload directory exists */
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ---------- Storage: safe generated filenames ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Never use the original filename — generate a safe random name
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || '.bin';
    const randomName = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    cb(null, `${timestamp}_${randomName}${ext}`);
  }
});

/* ---------- File filter: only allow image MIME types ---------- */
function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Please select a valid image file (JPG, PNG, WEBP, or GIF).', ['Invalid image type']));
  }
}

/* ---------- Multer instance ---------- */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

/**
 * Middleware to handle a single image upload field.
 * Wraps multer to convert MulterError into friendly ApiError.
 */
function uploadSingleImage(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        // Multer file size limit error
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'Image must be smaller than 5 MB.', ['File too large']));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ApiError(400, 'Only one image can be uploaded.', ['Too many files']));
          }
          return next(new ApiError(400, 'Image upload failed. Please try again.', ['Upload error']));
        }
        // ApiError from fileFilter (invalid type)
        if (err instanceof ApiError) {
          return next(err);
        }
        // Unknown error — do not expose internals
        return next(new ApiError(400, 'Image upload failed. Please try again.', ['Upload error']));
      }
      next();
    });
  };
}

module.exports = { uploadSingleImage, UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES };