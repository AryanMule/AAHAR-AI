// ============================================================
// AAHAR-AI — Image Preprocessing Module
// Resize, normalize, and enhance images for OCR
// ============================================================
const sharp = require('sharp');

/**
 * Process an image buffer for optimal OCR extraction:
 * - Resize to max 2000px wide
 * - Convert to grayscale
 * - Sharpen edges
 * - Normalize contrast
 * @param {Buffer} imageBuffer - raw image buffer
 * @returns {Promise<Buffer>} - processed PNG buffer
 */
async function processImage(imageBuffer) {
    try {
        const processed = await sharp(imageBuffer)
            .resize(2000, null, { fit: 'inside', withoutEnlargement: true })
            .greyscale()
            .sharpen({ sigma: 1.5 })
            .normalise()
            .png()
            .toBuffer();

        return processed;
    } catch (err) {
        console.warn('Image preprocessing warning:', err.message);
        // Return original if processing fails
        return imageBuffer;
    }
}

module.exports = { processImage };
