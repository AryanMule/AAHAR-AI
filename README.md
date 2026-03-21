# AAHAR-AI — AI-based Allergen Assessment, Health Analysis and Recommendation System

> 🛡️ An intelligent food allergen detection web app powered by **Google Gemini AI**, personalized to your unique health profile.

## What is AAHAR-AI?

AAHAR-AI is a web application that helps individuals with food allergies quickly identify potential allergens in food products. It combines AI-powered analysis with a personalized health profile to deliver risk-scored, actionable results.

### Key Features

- **📸 Multi-mode Scanning** — Barcode, OCR (camera/label reading), or manual text input
- **🧠 Gemini AI Analysis** — Deep, context-aware ingredient analysis with personalized risk scoring
- **🎯 Personalized Risk Scoring** — Risk = Confidence × Severity Weight, tuned to YOUR allergen profile
- **👤 Health Profiles** — Store allergies (with severity levels), dietary preferences, medical conditions, and emergency contacts
- **🔊 Text-to-Speech** — Hear results read aloud for accessibility
- **📜 Scan History** — Track past scans with feedback support
- **🔒 Privacy First** — All data stored locally on your device

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no frameworks)
- **AI Engine:** Google Gemini 2.0 Flash API
- **OCR:** Tesseract.js v5 (client-side)
- **Barcode:** Clarifai API + OpenFoodFacts
- **Auth:** Client-side with SHA-256 hashing (Web Crypto API)
- **Storage:** localStorage (multi-user, zero server dependency)

## Getting Started

1. Open `index.html` in a modern browser
2. Create an account (data is stored locally)
3. Complete the onboarding wizard — set your allergies, severity levels, dietary preferences
4. Get a free **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)
5. Start scanning food labels!

## How It Works

1. **Grab & Scan** — Point your camera at any food label, barcode, or ingredient list
2. **AI Analyzes** — Gemini AI cross-references ingredients against your unique allergy profile with severity-weighted risk scoring
3. **Get Results** — Instant personalized verdict (safe / caution / danger) with risk percentages, dietary flags, and voice readout

## Risk Scoring Formula

```
Risk = Confidence × Severity Weight
```

| Severity | Weight |
|----------|--------|
| High     | 1.0    |
| Medium   | 0.6    |
| Low      | 0.3    |

**Example:** Milk detected (confidence: 0.9) → User severity: High (1.0) → **90% RISK**

## Team

- **Aditya Pawar** — [LinkedIn](https://www.linkedin.com/in/adityapawar393/)
- **Ujjwal Pingle** — [LinkedIn](https://www.linkedin.com/in/ujjwal-pingle-730a69246/)
- **Diksha More** — [LinkedIn](https://www.linkedin.com/in/diksha-more-602527257/)
- **Aryan Mule** — [LinkedIn](https://www.linkedin.com/in/aryan-mule-759428258/)

## License

© 2025 AAHAR-AI. All rights reserved. Your data stays on your device.
