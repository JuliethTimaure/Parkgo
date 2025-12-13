const cloudinary = require('cloudinary').v2;
require('dotenv').config();

if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log(`✅ [CLOUDINARY] Servicio configurado: ${process.env.CLOUDINARY_CLOUD_NAME}`);
} else {
    console.warn('⚠️ [CLOUDINARY] No se detectaron credenciales. La subida de imágenes fallará.');
}

module.exports = cloudinary;