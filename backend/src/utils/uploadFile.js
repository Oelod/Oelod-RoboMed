const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const uploadToCloudinary = (fileBuffer, folder = 'robomed/cases') => {
  return new Promise((resolve, reject) => {
    // 🚀 Fallback mock: allows testing without real Cloudinary keys
    if (process.env.CLOUDINARY_API_KEY === 'your_api_key' || !process.env.CLOUDINARY_API_KEY) {
      console.log('⚠️ Using dummy Cloudinary uploader since API key is "your_api_key"');
      const isAudio = folder.includes('audio');
      return resolve({
        publicId: `mock_${Date.now()}`,
        fileUrl: isAudio 
          ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' 
          : `https://via.placeholder.com/600x400.png?text=Mock+Record+${Date.now()}`
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' }, // auto allows pdf/images
      (error, result) => {
        if (error) return reject(new Error('Cloudinary upload failed: ' + error.message));
        resolve({
          publicId: result.public_id,
          fileUrl:  result.secure_url,
        });
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

module.exports = { uploadToCloudinary };
