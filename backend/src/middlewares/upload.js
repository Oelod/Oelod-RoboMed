const multer = require('multer');

// Configure multer to use RAM instead of disk
// The buffer will then be streamed to cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow images, PDFs and Audio
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp', 
    'application/pdf', 
    'audio/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Supported: JPEG, PNG, WEBP, PDF, and Audio (WebM/MP3).');
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per file for heavy lab reports
  fileFilter,
});

module.exports = upload;
