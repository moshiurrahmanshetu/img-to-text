"""Image-to-Text OCR Web Application - Backend API (Phase 1)

This module provides the minimal FastAPI application backend.
Phase 1 includes health check and setup for future OCR integration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Image to Text OCR API",
    description="FastAPI Backend for Image-to-Text Web Application",
    version="1.0.0",
)

# Enable CORS for local frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root endpoint providing service information."""
    return {
        "name": "Image to Text OCR API",
        "version": "1.0.0",
        "status": "online",
        "health_check": "/api/health",
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend operational status."""
    return {
        "status": "ok",
        "message": "Image to Text API is healthy and running",
        "phase": 1,
    }


# Note: OCR extraction endpoint (e.g., /api/extract-text) will be added in Phase 2.
