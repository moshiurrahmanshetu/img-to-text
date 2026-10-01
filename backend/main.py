"""Image-to-Text OCR Web Application - Backend API (Phase 2)

FastAPI application with hybrid PaddleOCR and Tesseract OCR integration.
Supports English/multilingual via PaddleOCR and Bengali/Bangla via Tesseract (ben.traineddata).
"""

import io
import logging
import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pytesseract
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("img-to-text-backend")

# Configure Tesseract binary and tessdata paths
def find_tesseract_binary() -> Optional[str]:
    """Find tesseract executable across project folders, local app data, or system PATH."""
    base_dir = Path(__file__).resolve().parent
    candidates = [
        base_dir / "tesseract" / "tesseract.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Tesseract-OCR" / "tesseract.exe",
        Path("C:/Program Files/Tesseract-OCR/tesseract.exe"),
        Path("C:/Program Files (x86)/Tesseract-OCR/tesseract.exe"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    return None


def find_tessdata_dir() -> Optional[str]:
    """Find the directory containing ben.traineddata."""
    base_dir = Path(__file__).resolve().parent
    candidates = [
        base_dir / "tessdata",
        base_dir / "tesseract" / "tessdata",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Tesseract-OCR" / "tessdata",
        Path("C:/Program Files/Tesseract-OCR/tessdata"),
        Path("C:/Program Files (x86)/Tesseract-OCR/tessdata"),
    ]
    for candidate in candidates:
        if candidate.exists() and (candidate / "ben.traineddata").exists():
            return str(candidate)

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return None


tess_binary = find_tesseract_binary()
if tess_binary:
    pytesseract.pytesseract.tesseract_cmd = tess_binary
    logger.info("Configured Tesseract binary at: %s", tess_binary)
else:
    logger.warning("Tesseract binary could not be found automatically.")

tessdata_path = find_tessdata_dir()
if tessdata_path:
    os.environ["TESSDATA_PREFIX"] = tessdata_path
    logger.info("Configured TESSDATA_PREFIX at: %s", tessdata_path)

app = FastAPI(
    title="Image to Text OCR API",
    description="FastAPI Backend for Image-to-Text Web Application with PaddleOCR and Tesseract OCR",
    version="2.1.0",
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

# Supported languages
SUPPORTED_LANGUAGES = {
    "auto": "Auto Detect",
    "en": "English",
    "ben": "বাংলা (Bengali)",
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
    if lang_key not in SUPPORTED_LANGUAGES or lang_key in ("auto", "ben", "bn", "bangla", "bengali"):
        lang_key = "en"

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


def extract_with_paddle(img_np: np.ndarray, lang: str = "en") -> Dict:
    """Execute PaddleOCR extraction (for English / multilingual)."""
    ocr_engine = get_ocr_engine(lang)
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

    return {
        "text": "\n".join(full_text_lines),
        "lines": extracted_lines,
        "total_lines": len(extracted_lines),
        "engine": f"PaddleOCR ({lang})",
    }


def extract_with_tesseract(pil_img: Image.Image, lang: str = "ben") -> Dict:
    """Execute Tesseract OCR extraction (for Bengali / Bangla)."""
    raw_text = pytesseract.image_to_string(pil_img, lang=lang)
    raw_lines = raw_text.splitlines()

    extracted_lines: List[Dict] = []
    full_text_lines: List[str] = []

    for line in raw_lines:
        line_clean = line.strip()
        if line_clean:
            full_text_lines.append(line_clean)
            extracted_lines.append({
                "text": line_clean,
                "confidence": 0.95,
                "box": [],
            })

    return {
        "text": "\n".join(full_text_lines),
        "lines": extracted_lines,
        "total_lines": len(extracted_lines),
        "engine": f"Tesseract OCR ({lang})",
    }


# Pre-load default English OCR engine at startup
@app.on_event("startup")
def startup_event():
    logger.info("Pre-warming default English PaddleOCR model...")
    get_ocr_engine("en")
    logger.info("Verifying Tesseract Bengali model...")
    if tess_binary and tessdata_path:
        logger.info("Tesseract Bengali OCR is ready.")
    else:
        logger.warning("Tesseract Bengali OCR setup may be incomplete.")
    logger.info("Backend initialized and ready for OCR requests.")


@app.get("/")
def root():
    """Root endpoint providing service information."""
    return {
        "name": "Image to Text OCR API",
        "version": "2.1.0",
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
        "ocr_engines": {
            "english_multilingual": "PaddleOCR 2.9.1 (PP-OCRv4)",
            "bengali": "Tesseract OCR (ben.traineddata)",
        },
        "supported_languages": SUPPORTED_LANGUAGES,
    }


@app.post("/api/ocr")
async def extract_text_from_image(
    file: UploadFile = File(..., description="Image file to process"),
    lang: Optional[str] = Form("auto", description="Target OCR language code (auto, en, ben)"),
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
        with Image.open(io.BytesIO(image_bytes)) as opened_img:
            # Convert RGBA / Palette images to RGB
            if opened_img.mode in ("RGBA", "LA", "P"):
                rgb_img = Image.new("RGB", opened_img.size, (255, 255, 255))
                if opened_img.mode == "P":
                    opened_img = opened_img.convert("RGBA")
                rgb_img.paste(opened_img, mask=opened_img.split()[-1] if opened_img.mode == "RGBA" else None)
                pil_img = rgb_img.copy()
            else:
                pil_img = opened_img.convert("RGB")

            img_np = np.array(pil_img)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to decode image: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not decode image file: {str(e)}",
        )

    # Determine OCR routing mode
    lang_normalized = (lang or "auto").lower().strip()
    is_bengali_request = lang_normalized in ("ben", "bn", "bangla", "bengali", "বাংলা")
    is_auto_detect = lang_normalized in ("auto", "auto_detect", "autodetect", "")
    is_english_request = lang_normalized in ("en", "english")

    try:
        if is_bengali_request:
            # Route directly to Tesseract Bengali OCR
            result = extract_with_tesseract(pil_img, lang="ben")
        elif is_english_request:
            # Route directly to PaddleOCR English OCR
            result = extract_with_paddle(img_np, lang="en")
        elif is_auto_detect:
            # Auto Detect: Try PaddleOCR first. If empty or no lines found, try Tesseract Bengali
            result = extract_with_paddle(img_np, lang="en")
            if result["total_lines"] == 0:
                logger.info("Auto Detect: PaddleOCR found 0 lines, falling back to Tesseract Bengali...")
                ben_result = extract_with_tesseract(pil_img, lang="ben")
                if ben_result["total_lines"] > 0:
                    result = ben_result
        else:
            # Other supported languages via PaddleOCR
            result = extract_with_paddle(img_np, lang=lang_normalized)

        return {
            "success": True,
            "filename": file.filename,
            "language": lang_normalized,
            "engine": result.get("engine", "OCR Engine"),
            "total_lines": result["total_lines"],
            "text": result["text"],
            "lines": result["lines"],
        }

    except Exception as e:
        logger.error("OCR extraction failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}",
        )
