"""Image-to-Text OCR Web Application - Backend API (Phase 2)

FastAPI application with PaddleOCR integration for image-to-text extraction.
"""

import io
import logging
from typing import Dict, List, Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("img-to-text-backend")

app = FastAPI(
    title="Image to Text OCR API",
    description="FastAPI Backend for Image-to-Text Web Application with PaddleOCR",
    version="2.0.0",
)

# Enable CORS for local and cross-origin frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for PaddleOCR engine instances by language
OCR_ENGINES: Dict[str, PaddleOCR] = {}

# Supported languages in built-in PaddleOCR models
SUPPORTED_LANGUAGES = {
    "en": "English",
    "latin": "Latin / Multilingual",
    "ch": "Chinese (Simplified)",
    "chinese_cht": "Chinese (Traditional)",
    "korean": "Korean",
    "japan": "Japanese",
    "devanagari": "Devanagari (Hindi/Sanskrit)",
    "ta": "Tamil",
    "te": "Telugu",
    "ka": "Kannada",
    "arabic": "Arabic",
    "cyrillic": "Cyrillic",
}


def get_ocr_engine(lang: str = "en") -> PaddleOCR:
    """Retrieve or initialize a cached PaddleOCR engine for the specified language.

    Falls back to 'latin' or 'en' if unsupported language code is provided.
    """
    lang_key = lang.lower().strip() if lang else "en"
    if lang_key not in SUPPORTED_LANGUAGES:
        # Fallback to english or latin for multilingual compatibility
        logger.warning(
            "Requested language '%s' is not directly supported by default model set. Falling back to 'latin'.",
            lang_key,
        )
        lang_key = "latin"

    if lang_key not in OCR_ENGINES:
        logger.info("Initializing PaddleOCR engine for language: %s", lang_key)
        try:
            OCR_ENGINES[lang_key] = PaddleOCR(
                use_angle_cls=True,
                lang=lang_key,
                show_log=False,
            )
        except Exception as e:
            logger.error("Failed to initialize PaddleOCR with lang '%s': %s", lang_key, e)
            if "en" not in OCR_ENGINES:
                OCR_ENGINES["en"] = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            return OCR_ENGINES["en"]

    return OCR_ENGINES[lang_key]


# Pre-load default English OCR engine at startup
@app.on_event("startup")
def startup_event():
    logger.info("Pre-warming default English OCR model...")
    get_ocr_engine("en")
    logger.info("Backend initialized and ready for OCR requests.")


@app.get("/")
def root():
    """Root endpoint providing service information."""
    return {
        "name": "Image to Text OCR API",
        "version": "2.0.0",
        "status": "online",
        "health_check": "/api/health",
        "ocr_endpoint": "/api/ocr",
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend and OCR operational status."""
    return {
        "status": "ok",
        "message": "Image to Text API is healthy and running",
        "phase": 2,
        "ocr_engine": "PaddleOCR 2.9.1 (PP-OCRv4)",
        "supported_languages": SUPPORTED_LANGUAGES,
    }


@app.post("/api/ocr")
async def extract_text_from_image(
    file: UploadFile = File(..., description="Image file to process"),
    lang: Optional[str] = Form("en", description="Target OCR language code"),
):
    """Process an uploaded image and return extracted text with line breaks preserved."""
    # Validate content type
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or file.filename.lower().endswith(
        (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif")
    )):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a valid image file (PNG, JPG, WEBP, BMP, etc.).",
        )

    # Read image data safely into memory
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # Open and validate image with PIL
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            # Convert RGBA / Palette images to RGB
            if pil_img.mode in ("RGBA", "LA", "P"):
                rgb_img = Image.new("RGB", pil_img.size, (255, 255, 255))
                if pil_img.mode == "P":
                    pil_img = pil_img.convert("RGBA")
                rgb_img.paste(pil_img, mask=pil_img.split()[-1] if pil_img.mode == "RGBA" else None)
                img_np = np.array(rgb_img)
            else:
                img_np = np.array(pil_img.convert("RGB"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to decode image: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not decode image file: {str(e)}",
        )

    # Execute PaddleOCR inference
    try:
        ocr_engine = get_ocr_engine(lang or "en")
        results = ocr_engine.ocr(img_np, cls=True)

        extracted_lines: List[Dict] = []
        full_text_lines: List[str] = []

        if results and results[0]:
            for line_data in results[0]:
                if len(line_data) >= 2 and line_data[1]:
                    text, confidence = line_data[1]
                    text_str = str(text).strip()
                    if text_str:
                        full_text_lines.append(text_str)
                        extracted_lines.append({
                            "text": text_str,
                            "confidence": round(float(confidence), 4),
                            "box": [[float(coord) for coord in point] for point in line_data[0]],
                        })

        full_text = "\n".join(full_text_lines)

        return {
            "success": True,
            "filename": file.filename,
            "language": lang or "en",
            "total_lines": len(extracted_lines),
            "text": full_text,
            "lines": extracted_lines,
        }

    except Exception as e:
        logger.error("OCR extraction failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}",
        )
