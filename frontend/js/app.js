/**
 * Image to Text OCR Web Application - Frontend Logic (Phase 1)
 * Handles file upload, drag-and-drop, clipboard paste, image preview, copy, and reset.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
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
  const systemStatus = document.getElementById('systemStatus');
  const systemStatusText = document.getElementById('systemStatusText');
  
  const extractedTextArea = document.getElementById('extractedTextArea');
  const charCountBadge = document.getElementById('charCount');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyIcon = document.getElementById('copyIcon');
  const resetBtn = document.getElementById('resetBtn');

  // Bootstrap Toast instance
  const toastElement = document.getElementById('liveToast');
  const toastText = document.getElementById('toastText');
  const toastIcon = document.getElementById('toastIcon');
  const bsToast = new bootstrap.Toast(toastElement, { delay: 3000 });

  // Current state
  let currentFile = null;

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

      // Update Metadata
      fileNameDisplay.innerHTML = `<i class="bi bi-file-image me-1"></i> ${file.name || 'Pasted Image'}`;
      fileSizeDisplay.textContent = formatBytes(file.size);
      imageBadge.textContent = 'Image Loaded';
      imageBadge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle fw-normal';

      statusMessage.innerHTML = '<i class="bi bi-check-circle text-success me-1"></i> Image loaded (Ready for OCR in Phase 2)';
      systemStatus.className = 'status-pill active';
      systemStatusText.textContent = 'Image Ready';

      showToast('Image loaded successfully');
    };

    reader.onerror = () => {
      showToast('Failed to read the image file.', 'danger');
    };

    reader.readAsDataURL(file);
  }

  /**
   * Reset all elements to their initial state
   */
  function resetAll() {
    currentFile = null;
    fileInput.value = '';
    imagePreview.src = '';

    // Reset UI View Visibility
    dropzone.classList.remove('d-none');
    previewContainer.classList.remove('active');
    fileInfoBar.classList.remove('active');
    changeImageBtn.classList.add('d-none');

    // Reset Labels & Badges
    imageBadge.textContent = 'No image selected';
    imageBadge.className = 'badge bg-light text-secondary border fw-normal';
    statusMessage.innerHTML = '<i class="bi bi-info-circle me-1"></i> Select or paste an image to begin';
    systemStatus.className = 'status-pill ready';
    systemStatusText.textContent = 'Ready';

    // Clear Textarea and Character Count
    extractedTextArea.value = '';
    updateCharCount();

    showToast('Everything has been reset');
  }

  /**
   * Update character count for textarea
   */
  function updateCharCount() {
    const length = extractedTextArea.value.length;
    charCountBadge.textContent = `${length} character${length === 1 ? '' : 's'}`;
  }

  /**
   * Copy textarea content to user's clipboard
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
        // Fallback for older browsers / insecure context
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

  // 2. Drag & Drop events on dropzone
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

  // Prevent default window drag/drop behavior (prevents opening file in new tab)
  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', (e) => e.preventDefault(), false);

  // 3. Clipboard Image Paste (Ctrl + V)
  document.addEventListener('paste', (e) => {
    // If active element is textarea and user pasted plain text, let it happen naturally
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
      // Pasted non-image content when not inside textarea
      const firstItem = clipboardItems[0];
      if (firstItem.kind === 'string' && firstItem.type.indexOf('text/plain') !== -1) {
        // Optional subtle guidance
      }
    }
  });

  // 4. Textarea Input Listener
  extractedTextArea.addEventListener('input', updateCharCount);

  // 5. Button Actions
  copyBtn.addEventListener('click', copyTextToClipboard);
  resetBtn.addEventListener('click', resetAll);

  // Initial count update
  updateCharCount();
});
