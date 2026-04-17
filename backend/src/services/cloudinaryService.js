const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Uploads a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise} - Cloudinary upload result
 */
const uploadFromBuffer = (buffer, folder = 'robomed/profiles') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports = {
  uploadFromBuffer,
};
