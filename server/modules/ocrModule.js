// ============================================================
// AAHAR-AI — OCR Module (Server-side)
// Extract text from ingredient label images using Tesseract.js
// ============================================================
const Tesseract = require('tesseract.js');

let worker = null;

/**
 * Initialize the Tesseract worker (lazy)
 */
async function getWorker() {
    if (!worker) {
        worker = await Tesseract.createWorker('eng');
    }
    return worker;
}

/**
 * Extract text from an image buffer
 * @param {Buffer} imageBuffer - preprocessed image
 * @returns {Promise<string>} - extracted text
 */
async function extractText(imageBuffer) {
    const w = await getWorker();
    const { data: { text } } = await w.recognize(imageBuffer);

    if (!text || text.trim().length < 3) {
        throw new Error('OCR could not extract readable text from the image. Please try a clearer photo.');
    }

    return text.trim();
}

module.exports = { extractText };
