# Image to Text (Phase 1)

A lightweight and simple Image-to-Text OCR web application built with a responsive Bootstrap 5 frontend and a FastAPI backend.

> **Note:** This is **Phase 1** of the project. It establishes the project architecture, frontend user interface (image upload, drag & drop, clipboard paste, image preview, copy to clipboard, and reset), and a minimal FastAPI backend. OCR engine integration will be added in Phase 2.

---

## 📁 Project Structure

```text
img-to-text/
├── frontend/
│   ├── index.html        # Main HTML5 single-page interface
│   ├── css/
│   │   └── style.css     # Clean, modern custom stylesheet
│   └── js/
│       └── app.js        # Vanilla JavaScript handling UI interactions
├── backend/
│   ├── main.py           # Minimal FastAPI application & health endpoint
│   └── requirements.txt  # Python dependencies
└── README.md             # Project documentation and setup guide
```

---

## 🚀 Features (Phase 1)

* **Clean & Modern UI:** Simple, lightweight single-page layout built with HTML5, CSS3, and Bootstrap 5.
* **Responsive Design:** Side-by-side two-column view on desktop, stacking seamlessly on tablets and mobile devices.
* **Flexible Image Upload:**
  * **Click to Browse:** Select an image via system file dialog.
  * **Drag & Drop:** Drag an image directly into the dropzone.
  * **Clipboard Paste (<kbd>Ctrl</kbd> + <kbd>V</kbd>):** Paste any image directly from the clipboard.
* **Instant Image Preview:** High-resolution preview with filename and size metadata display.
* **Editable Extracted Text Area:** Large textarea ready to receive extracted text in Phase 2, with real-time character counter.
* **Clipboard Copy:** Quick one-click "Copy Text" button with instant visual feedback.
* **Start Again:** One-click reset to restore the initial clean state.
* **FastAPI Backend:** Minimal, extensible FastAPI application with CORS enabled and `/api/health` status check.

---

## 🛠️ Local Setup & Run Instructions

### 1. Backend Setup (FastAPI)

1. Open your terminal and navigate to the project directory:
   ```bash
   cd "g:\Python Project\img-to-text"
   ```

2. (Optional but recommended) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Start the FastAPI development server:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

5. Check API health:
   * Open your browser or run: [http://localhost:8000/api/health](http://localhost:8000/api/health)
   * Expected response:
     ```json
     {
       "status": "ok",
       "message": "Image to Text API is healthy and running",
       "phase": 1
     }
     ```
   * Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend Setup

The frontend is completely static and lightweight. You can run it in any of the following ways:

* **Option A (Direct in Browser):**
  Simply double-click or open `frontend/index.html` in your favorite web browser.

* **Option B (Python Built-in HTTP Server):**
  From the project directory, run:
  ```bash
  python -m http.server 3000 --directory frontend
  ```
  Then visit [http://localhost:3000](http://localhost:3000).

---

## 🔮 Roadmap (Phase 2)

* Integrate **PaddleOCR** into `backend/main.py`.
* Connect frontend to backend via `POST /api/extract-text`.
* Add progress/loading states during OCR inference.