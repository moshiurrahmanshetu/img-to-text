# Image to Text (Phase 2 - OCR Engine Integration)

A lightweight, simple, and responsive Image-to-Text OCR web application with a Bootstrap 5 frontend and a FastAPI backend powered by PaddleOCR.

---

## 📁 Project Structure

```text
img-to-text/
├── frontend/
│   ├── index.html        # Main single-page UI with upload, preview, and OCR conversion
│   ├── css/
│   │   └── style.css     # Clean, modern stylesheet
│   └── js/
│       └── app.js        # Vanilla JS handling drag-and-drop, paste, preview, and OCR API calls
├── backend/
│   ├── main.py           # FastAPI server with PaddleOCR integration (/api/ocr)
│   └── requirements.txt  # Python dependencies
└── README.md             # Project documentation and setup guide
```

---

## 🚀 Features (Phase 2)

* **Full OCR Pipeline Integration:** Seamless end-to-end extraction from uploaded image to editable text.
* **PaddleOCR Engine:** Fast, state-of-the-art text detection and recognition (PP-OCRv4).
* **Multiple Upload Methods:**
  * **Click to Browse:** Select an image via system file picker.
  * **Drag & Drop:** Drag an image directly into the dropzone.
  * **Clipboard Paste (<kbd>Ctrl</kbd> + <kbd>V</kbd>):** Paste images directly from the clipboard.
* **Instant Image Preview:** High-resolution preview with filename and size metadata.
* **Convert to Text Action:** One-click conversion button with real-time loading spinner and duplicate prevention.
* **Preserved Line Breaks:** Extracts multiline text with proper spacing and newline preservation.
* **Editable Extracted Text:** Large editable textarea with real-time character and line counters.
* **One-Click Copy:** Copies extracted text to the system clipboard with visual feedback.
* **Start Again Reset:** Restores the entire interface to a clean initial state.
* **Safe In-Memory Processing:** Images are processed in memory and never permanently stored on disk.
* **CORS Enabled:** Seamless communication between frontend and backend during local development.

---

## 🛠️ Local Setup & Execution

### 1. Backend Setup (FastAPI & PaddleOCR)

1. Open your terminal and navigate to the project directory:
   ```bash
   cd "g:\Python Project\img-to-text"
   ```

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Start the FastAPI backend server:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

4. Verify backend health:
   * **Health check URL:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
   * **Interactive API documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Frontend Execution

You can run the frontend in either of the following ways:

* **Option A (Direct in Browser):**
  Open `frontend/index.html` directly in any web browser.

* **Option B (Python Local Web Server):**
  From the project directory, run:
  ```bash
  python -m http.server 3000 --directory frontend
  ```
  Then visit [http://localhost:3000](http://localhost:3000).

---
PS G:\Python Project\img-to-text\backend> python -m uvicorn main:app --host 127.0.0.1 --port 8000

## 📡 API Reference

### `GET /api/health`
Returns backend operational status, active OCR version, and supported languages.

### `POST /api/ocr`
Processes an uploaded image file and returns detected text lines.

**Request:**
* `file`: Image file (multipart/form-data)
* `lang`: (Optional) Language code (`en`, `latin`, `devanagari`, `ch`, `japan`, `korean`, `arabic`, etc.)

**Response Example:**
```json
{
  "success": true,
  "filename": "sample.png",
  "language": "en",
  "total_lines": 2,
  "text": "Hello OCR World\nLine Two Extracted Text",
  "lines": [
    {
      "text": "Hello OCR World",
      "confidence": 0.9785,
      "box": [[9.0, 15.0], [88.0, 15.0], [88.0, 27.0], [9.0, 27.0]]
    },
    {
      "text": "Line Two Extracted Text",
      "confidence": 0.9899,
      "box": [[9.0, 46.0], [121.0, 46.0], [121.0, 58.0], [9.0, 58.0]]
    }
  ]
}
```