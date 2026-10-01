/**
 * Image to Text OCR Web Application - Frontend Logic (Phase 2)
 * Handles file upload, drag-and-drop, clipboard paste, image preview,
 * OCR execution via FastAPI backend, copy, and reset.
 */

// Configurable API base URL (defaults to local FastAPI backend)
const API_BASE_URL = 'http://127.0.0.1:8000';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Left Panel (Source Image)
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const fileInfoBar = document.getElementById('fileInfoBar');
  const fileNameDisplay = document.getElementById('fileName');
  const fileSizeDisplay = document.getElementById('fileSize');
  const imageBadge = document.getElementById('imageBadge');
  const changeImageBtn = document.getElementById('changeImageBtn');
  const statusMessage = document.getElementById('statusMessage');
  const convertBtn = document.getElementById('convertBtn');
  const convertBtnText = document.getElementById('convertBtnText');
  const convertIcon = document.getElementById('convertIcon');
  const convertSpinner = document.getElementById('convertSpinner');
  const ocrLangSelect = document.getElementById('ocrLangSelect');

  // Header System Status
  const systemStatus = document.getElementById('systemStatus');
  const systemStatusText = document.getElementById('systemStatusText');

  // DOM Elements - Right Panel (Extracted Text)
  const extractedTextArea = document.getElementById('extractedTextArea');
  const charCountBadge = document.getElementById('charCount');
  const lineCountBadge = document.getElementById('lineCount');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyIcon = document.getElementById('copyIcon');
  const resetBtn = document.getElementById('resetBtn');

  // Bootstrap Toast Instance
  const toastElement = document.getElementById('liveToast');
  const toastText = document.getElementById('toastText');
  const toastIcon = document.getElementById('toastIcon');
  const bsToast = new bootstrap.Toast(toastElement, { delay: 3500 });

  // State
  let currentFile = null;
  let isProcessing = false;

  /**
   * Display toast notification
   * @param {string} message - Text message to show
   * @param {'success' | 'warning' | 'danger'} type - Notification type
   */
  function showToast(message, type = 'success') {
    toastText.textContent = message;

    // Reset icon classes
    toastIcon.className = 'bi me-1 ';
    if (type === 'success') {
      toastIcon.classList.add('bi-check-circle-fill', 'text-success');
    } else if (type === 'warning') {
      toastIcon.classList.add('bi-exclamation-triangle-fill', 'text-warning');
    } else {
      toastIcon.classList.add('bi-x-circle-fill', 'text-danger');
    }

    bsToast.show();
  }

  /**
   * Format file size in human-readable units
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Process and validate a selected or pasted file
   * @param {File} file
   */
  function handleImageFile(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP, etc.)', 'warning');
      return;
    }

    currentFile = file;

    // Read and display image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;

      // Update UI Views
      dropzone.classList.add('d-none');
      previewContainer.classList.add('active');
      fileInfoBar.classList.add('active');
      changeImageBtn.classList.remove('d-none');

      // Enable Convert Button
      convertBtn.disabled = false;

      // Update Metadata
      fileNameDisplay.innerHTML = `<i class="bi bi-file-image me-1"></i> ${file.name || 'Pasted Image'}`;
      fileSizeDisplay.textContent = formatBytes(file.size);
      imageBadge.textContent = 'Image Ready';
      imageBadge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle fw-normal';

      statusMessage.innerHTML = '<i class="bi bi-check-circle text-success me-1"></i> Image ready for conversion';
      systemStatus.className = 'status-pill ready';
      systemStatusText.textContent = 'Ready';

      showToast('Image loaded. Click "Convert to Text" to process.');
    };

    reader.onerror = () => {
      showToast('Failed to read the image file.', 'danger');
    };

    reader.readAsDataURL(file);
  }

  /**
   * Send the selected image to the FastAPI OCR backend
   */
  async function performOCR() {
    if (!currentFile) {
      showToast('Please select or paste an image first.', 'warning');
      return;
    }

    if (isProcessing) return;

    isProcessing = true;

    // UI Loading State
    convertBtn.disabled = true;
    convertIcon.classList.add('d-none');
    convertSpinner.classList.remove('d-none');
    convertBtnText.textContent = 'Extracting...';

    systemStatus.className = 'status-pill active';
    systemStatusText.textContent = 'Processing';
    statusMessage.innerHTML = '<span class="spinner-border spinner-border-sm text-primary me-1" role="status"></span> Extracting text with PaddleOCR...';

    // Build form data payload
    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('lang', ocrLangSelect.value || 'en');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = errData.detail;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (result.success) {
        extractedTextArea.value = result.text || '';
        updateCharCount();

        if (!result.text || !result.text.trim()) {
          statusMessage.innerHTML = '<i class="bi bi-exclamation-circle text-warning me-1"></i> No text detected in image';
          systemStatus.className = 'status-pill ready';
          systemStatusText.textContent = 'Completed';
          showToast('OCR completed, but no text was detected in the image.', 'warning');
        } else {
          statusMessage.innerHTML = `<i class="bi bi-check2-circle text-success me-1"></i> Extracted ${result.total_lines} line(s) successfully`;
          systemStatus.className = 'status-pill ready';
          systemStatusText.textContent = 'Completed';
          showToast(`Extracted ${result.total_lines} text line(s) successfully!`);
        }
      } else {
        throw new Error(result.error || 'Failed to extract text from image');
      }

    } catch (error) {
      console.error('OCR Error:', error);
      let message = error.message || 'Error communicating with OCR backend';
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        message = `Could not connect to backend server at ${API_BASE_URL}. Ensure FastAPI is running on port 8000.`;
      }

      statusMessage.innerHTML = '<i class="bi bi-exclamation-triangle text-danger me-1"></i> OCR failed. You can try again.';
      systemStatus.className = 'status-pill';
      systemStatusText.textContent = 'Error';
      showToast(message, 'danger');

    } finally {
      isProcessing = false;
      convertBtn.disabled = !currentFile;
      convertIcon.classList.remove('d-none');
      convertSpinner.classList.add('d-none');
      convertBtnText.textContent = 'Convert to Text';
    }
  }

  /**
   * Reset all elements to their initial state
   */
  function resetAll() {
    currentFile = null;
    isProcessing = false;
    fileInput.value = '';
    imagePreview.src = '';

    // Reset UI Views
    dropzone.classList.remove('d-none');
    previewContainer.classList.remove('active');
    fileInfoBar.classList.remove('active');
    changeImageBtn.classList.add('d-none');

    // Disable Convert Button
    convertBtn.disabled = true;
    convertIcon.classList.remove('d-none');
    convertSpinner.classList.add('d-none');
    convertBtnText.textContent = 'Convert to Text';

    // Reset Labels & Badges
    imageBadge.textContent = 'No image selected';
    imageBadge.className = 'badge bg-light text-secondary border fw-normal';
    statusMessage.innerHTML = '<i class="bi bi-info-circle me-1"></i> Select or paste an image to begin';
    systemStatus.className = 'status-pill ready';
    systemStatusText.textContent = 'Ready';

    // Clear Textarea and Counts
    extractedTextArea.value = '';
    updateCharCount();

    showToast('Everything has been reset');
  }

  /**
   * Update character and line counts for textarea
   */
  function updateCharCount() {
    const text = extractedTextArea.value;
    const length = text.length;
    charCountBadge.textContent = `${length} character${length === 1 ? '' : 's'}`;

    if (length > 0) {
      const lines = text.split('\n').length;
      lineCountBadge.textContent = `${lines} line${lines === 1 ? '' : 's'}`;
      lineCountBadge.classList.remove('d-none');
    } else {
      lineCountBadge.classList.add('d-none');
    }
  }

  /**
   * Copy textarea content to clipboard
   */
  async function copyTextToClipboard() {
    const text = extractedTextArea.value;
    if (!text.trim()) {
      showToast('No text available to copy', 'warning');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / non-https contexts
        extractedTextArea.select();
        document.execCommand('copy');
      }

      // Visual feedback on copy button
      const originalText = copyBtnText.textContent;
      const originalIconClass = copyIcon.className;

      copyBtnText.textContent = 'Copied!';
      copyIcon.className = 'bi bi-check2';
      copyBtn.classList.replace('btn-primary', 'btn-success');

      showToast('Text copied to clipboard!');

      setTimeout(() => {
        copyBtnText.textContent = originalText;
        copyIcon.className = originalIconClass;
        copyBtn.classList.replace('btn-success', 'btn-primary');
      }, 2000);

    } catch (err) {
      showToast('Failed to copy text to clipboard', 'danger');
    }
  }

  // ==========================================
  // Event Listeners
  // ==========================================

  // 1. File Input triggers
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  changeImageBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  // 2. Drag & Drop events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      handleImageFile(dt.files[0]);
    }
  });

  // Prevent default window drag/drop behavior
  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', (e) => e.preventDefault(), false);

  // 3. Clipboard Image Paste (Ctrl + V)
  document.addEventListener('paste', (e) => {
    const isTextareaFocused = document.activeElement === extractedTextArea;
    const clipboardItems = (e.clipboardData || window.clipboardData).items;

    let foundImage = false;
    if (clipboardItems) {
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const blob = clipboardItems[i].getAsFile();
          if (blob) {
            e.preventDefault();
            handleImageFile(blob);
            foundImage = true;
            break;
          }
        }
      }
    }

    if (!foundImage && !isTextareaFocused && clipboardItems && clipboardItems.length > 0) {
      const firstItem = clipboardItems[0];
      if (firstItem.kind === 'string' && firstItem.type.indexOf('text/plain') !== -1) {
        // Normal string paste outside inputs
      }
    }
  });

  // 4. Textarea Input Listener
  extractedTextArea.addEventListener('input', updateCharCount);

  // 5. Button Actions
  convertBtn.addEventListener('click', performOCR);
  copyBtn.addEventListener('click', copyTextToClipboard);
  resetBtn.addEventListener('click', resetAll);

  // Initial count setup
  updateCharCount();
});
