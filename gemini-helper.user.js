// ==UserScript==
// @name         Gemini Helper
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Save and restore prompts and images in Gemini
// @author       lemontea
// @match        https://gemini.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // Styles for the helper UI
  GM_addStyle(`
        #gemini-helper-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            transition: background 0.2s;
            margin-right: 4px;
            user-select: none;
            color: var(--gemini-helper-icon-color, #5f6368);
        }
        #gemini-helper-toggle:hover {
            background-color: rgba(60, 64, 67, 0.08);
        }
        /* Dark mode hover override */
        .gh-dark-mode #gemini-helper-toggle:hover {
             background-color: rgba(255, 255, 255, 0.08);
        }
        
        #gemini-helper-panel {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 300px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            z-index: 9999;
            display: none;
            flex-direction: column;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            overflow: hidden;
            border: 1px solid #e0e0e0;
            transition: width 0.2s ease;
        }
        #gemini-helper-panel.gh-expanded {
            width: 600px;
        }
        /* Dark Mode Styles */
        .gh-dark-panel {
            background: #1e1f20 !important;
            border-color: #444 !important;
            color: #e3e3e3 !important;
        }
        .gh-dark-panel #gemini-helper-header {
            background: #2d2e30 !important;
            border-bottom-color: #444 !important;
        }
        .gh-dark-panel .gh-item {
            background: #2d2e30 !important;
            border-color: #444 !important;
        }
        .gh-dark-panel .gh-item-preview {
            color: #aaa !important;
        }
        .gh-dark-panel .gh-input {
            background: #333 !important;
            color: #fff !important;
            border-color: #555 !important;
        }
        
        #gemini-helper-header {
            padding: 12px 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #gemini-helper-content {
            padding: 16px;
            max-height: 400px;
            overflow-y: auto;
        }
        .gh-btn {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 18px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            margin-bottom: 8px;
            transition: background 0.2s;
        }
        .gh-btn:hover {
            background: #1557b0;
        }
        .gh-input {
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 8px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            box-sizing: border-box;
        }
        .gh-item {
            padding: 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 8px;
            background: #fff;
        }
        .gh-item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-weight: 500;
        }
        .gh-item-preview {
            font-size: 12px;
            color: #5f6368;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 8px;
        }
        .gh-item-actions {
            display: flex;
            gap: 8px;
        }
        .gh-item-btn {
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            border: none;
        }
        .gh-load { background: #e8f0fe; color: #1967d2; }
        .gh-delete { background: #fce8e6; color: #c5221f; }
        .gh-badge {
            font-size: 10px;
            background: #e8eaed;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 4px;
        }
        /* Dark mode badges/buttons adjustments */
        .gh-dark-panel .gh-load { background: #1c3aa9; color: #d2e3fc; }
        .gh-dark-panel .gh-delete { background: #691b19; color: #f6aea9; }
        .gh-dark-panel .gh-badge { background: #444; color: #ccc; }

        /* Tabs and Image Grid */
        .gh-tabs {
            display: flex;
            border-bottom: 1px solid #e0e0e0;
            background: #f1f3f4;
        }
        .gh-tab {
            flex: 1;
            text-align: center;
            padding: 10px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: #5f6368;
        }
        .gh-tab.active {
            color: #1a73e8;
            border-bottom: 2px solid #1a73e8;
            background: #fff;
        }
        .gh-view {
            display: none;
        }
        .gh-view.active {
            display: block;
        }
        .gh-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 12px;
        }
        .gh-img-item {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 1;
            border: 1px solid #e0e0e0;
            cursor: pointer;
        }
        .gh-img-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .gh-img-delete {
            position: absolute;
            top: 2px;
            right: 2px;
            background: rgba(0,0,0,0.5);
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            display: none;
        }
        .gh-img-item:hover .gh-img-delete {
            display: flex;
        }
        .gh-img-name {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255,255,255,0.9);
            font-size: 10px;
            padding: 2px 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
        }
        /* Dark mode tabs/grid */
        .gh-dark-panel .gh-tabs { background: #2d2e30; border-bottom-color: #444; }
        .gh-dark-panel .gh-tab { color: #aaa; }
        .gh-dark-panel .gh-tab.active { background: #1e1f20; color: #8ab4f8; border-bottom-color: #8ab4f8; }
        .gh-dark-panel .gh-img-item { border-color: #444; }
        .gh-dark-panel         .gh-img-name { background: rgba(30,31,32,0.9); color: #e3e3e3; }
        
        /* Replaceable text style */
        .gh-replaceable {
            background-color: #fff59d;
            border-bottom: 2px solid #fbc02d;
            color: #202124; /* Force dark text for contrast on yellow */
            cursor: pointer;
            padding: 0 2px;
            border-radius: 2px;
        }
        .gh-dark-mode .gh-replaceable {
            /* In dark mode, we can either use a dark highlight or keep the bright one with dark text.
               Let's use a slightly muted yellow but keep text dark for readability. */
            background-color: #fdd835;
            border-bottom-color: #fbc02d;
            color: #000000;
        }

        /* Edit View Styles */
        #gh-edit-area {
            width: 100%;
            height: 300px; /* Increased height */
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 12px; /* More padding */
            overflow-y: auto;
            margin-bottom: 8px;
            background: white;
            white-space: pre-wrap;
            outline: none;
            box-sizing: border-box; /* Ensure padding doesn't affect width */
            line-height: 1.5;
        }
        #gh-edit-area:focus {
            border-color: #1a73e8;
        }
        .gh-dark-panel #gh-edit-area {
            background: #333;
            border-color: #555;
            color: #fff;
        }
        .gh-toolbar {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        .gh-edit { background: #fbbc04; color: #202124; }
        .gh-dark-panel .gh-edit { background: #fdd663; color: #202124; }
    `);

  // Helper function to get the editor
  function getEditor() {
    // 1. Try to find the specific contenteditable area within the new Gemini structure
    // The user reported 'xapfileselectordropzone' and 'text-input-field'
    const wrappers = document.querySelectorAll(
      "[xapfileselectordropzone], .text-input-field"
    );
    for (const wrapper of wrappers) {
      const editable = wrapper.querySelector('[contenteditable="true"]');
      if (editable) return editable;
      // If the wrapper itself is editable (unlikely for a dropzone but possible)
      if (wrapper.getAttribute("contenteditable") === "true") return wrapper;
    }

    // 2. Fallback: any contenteditable (might pick up wrong things if there are multiple)
    const contentEditable = document.querySelector('[contenteditable="true"]');
    if (contentEditable) return contentEditable;

    // 3. Legacy QL
    const ql = document.querySelector(".ql-editor");
    if (ql) return ql;

    return null;
  }

  // Helper to find images
  function getImages() {
    // 1. Images inside the editor (pasted)
    const editor = getEditor();
    if (!editor) return [];
    const pastedImages = Array.from(editor.querySelectorAll("img")).map(
      (img) => ({
        type: "pasted",
        src: img.src,
        element: img,
      })
    );

    // 2. Images uploaded as files (thumbnails)
    const potentialUploads = Array.from(
      document.querySelectorAll('img[src^="blob:"], img[src^="data:image/"]')
    );

    // Filter out the ones inside editor since we already got them
    const uploads = potentialUploads
      .filter((img) => !editor.contains(img))
      .map((img) => ({
        type: "upload",
        src: img.src,
        element: img,
      }));

    return [...pastedImages, ...uploads];
  }

  // Save template
  function saveTemplate(name) {
    const editor = getEditor();
    if (!editor) {
      alert("Could not find Gemini input editor.");
      return;
    }

    const content = editor.innerHTML;
    const images = getImages();
    const text = editor.innerText;

    const template = {
      id: Date.now(),
      name: name || "Untitled",
      content: content,
      text: text,
      images: images,
      date: new Date().toISOString(),
    };

    const saved = GM_getValue("gemini_templates", []);
    saved.unshift(template);
    GM_setValue("gemini_templates", saved);
    renderList();
    document.getElementById("gh-name-input").value = "";
  }

  // Load template
  function loadTemplate(id) {
    const saved = GM_getValue("gemini_templates", []);
    const template = saved.find((t) => t.id === id);
    if (!template) return;

    const editor = getEditor();
    if (!editor) {
      alert("Could not find Gemini input editor.");
      return;
    }

    // Restore text/HTML
    // We need to process the content to ensure styles are inlined,
    // because Gemini's editor might strip classes or global CSS might not apply.
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = template.content;

    // Find replaceable parts and force inline styles
    tempDiv.querySelectorAll(".gh-replaceable").forEach((span) => {
      span.style.backgroundColor = "#fff59d";
      span.style.borderBottom = "2px solid #fbc02d";
      span.style.color = "#202124"; // Force black text for contrast
      span.style.cursor = "pointer";
    });

    editor.innerHTML = tempDiv.innerHTML;

    // Add click listeners to replaceable parts for easy selection
    // We need to re-query because we just set innerHTML
    editor.querySelectorAll(".gh-replaceable").forEach((span) => {
      span.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent editor from handling it weirdly
        const range = document.createRange();
        range.selectNodeContents(e.target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
    });

    // Attempt to restore images
    // If images were pasted (in content), they are already in innerHTML.
    // If they were uploads, we might need to re-insert them or just notify the user.
    // Since we can't programmatically "upload" files easily to the native input,
    // we will try to append them to the editor as pasted images if they aren't there.

    if (template.images && template.images.length > 0) {
      template.images.forEach((img) => {
        if (img.type === "upload") {
          // Try to append to editor
          const imgEl = document.createElement("img");
          imgEl.src = img.src;
          imgEl.style.maxWidth = "200px";
          editor.appendChild(document.createElement("br"));
          editor.appendChild(imgEl);
        }
      });
    }

    // Trigger events to notify Angular
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));

    // Also try to focus
    editor.focus();

    // Close panel
    document.getElementById("gemini-helper-panel").style.display = "none";
  }

  function deleteTemplate(id) {
    if (!confirm("Delete this template?")) return;
    const saved = GM_getValue("gemini_templates", []);
    const newSaved = saved.filter((t) => t.id !== id);
    GM_setValue("gemini_templates", newSaved);
    renderList();
  }

  let currentEditingId = null;

  function editTemplate(id) {
    const saved = GM_getValue("gemini_templates", []);
    const template = saved.find((t) => t.id === id);
    if (!template) return;

    currentEditingId = id;
    const editArea = document.getElementById("gh-edit-area");
    editArea.innerHTML = template.content;

    // Switch to edit view and expand panel
    document
      .querySelectorAll(".gh-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".gh-view")
      .forEach((v) => v.classList.remove("active"));
    document.getElementById("gh-view-edit").classList.add("active");
    document.getElementById("gemini-helper-panel").classList.add("gh-expanded");
  }

  function saveEditedTemplate() {
    if (!currentEditingId) return;

    const editArea = document.getElementById("gh-edit-area");
    const newContent = editArea.innerHTML;
    const newText = editArea.innerText;

    const saved = GM_getValue("gemini_templates", []);
    const index = saved.findIndex((t) => t.id === currentEditingId);
    if (index !== -1) {
      saved[index].content = newContent;
      saved[index].text = newText;
      saved[index].date = new Date().toISOString(); // Update date? Optional.
      GM_setValue("gemini_templates", saved);

      renderList();

      // Switch back
      document.querySelector('[data-tab="templates"]').click();
      document
        .getElementById("gemini-helper-panel")
        .classList.remove("gh-expanded");
    }
  }

  function wrapTextNodes(node) {
    if (node.nodeType === 3) {
      if (node.textContent.length === 0) return node;
      const span = document.createElement("span");
      span.className = "gh-replaceable";
      span.style.backgroundColor = "#fff59d";
      span.style.borderBottom = "2px solid #fbc02d";
      span.style.color = "#202124";
      span.style.cursor = "pointer";
      span.textContent = node.textContent;
      return span;
    }
    if (node.nodeType === 1 || node.nodeType === 11) {
      if (node.classList && node.classList.contains("gh-replaceable"))
        return node;
      Array.from(node.childNodes).forEach((child) => {
        const wrapped = wrapTextNodes(child);
        if (wrapped !== child) {
          node.replaceChild(wrapped, child);
        }
      });
    }
    return node;
  }

  function markSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = document.getElementById("gh-edit-area");

    // Ensure selection is inside our edit area
    if (!container.contains(range.commonAncestorContainer)) return;

    // Check if selection is empty
    if (range.collapsed) {
      alert("Please select some text to mark.");
      return;
    }

    // Check if already inside a replaceable span - if so, unwrap?
    // For simplicity, we just wrap.

    const span = document.createElement("span");
    span.className = "gh-replaceable";
    // Add inline styles to ensure they persist if classes are stripped or styles don't apply
    span.style.backgroundColor = "#fff59d";
    span.style.borderBottom = "2px solid #fbc02d";
    span.style.color = "#202124";
    span.style.cursor = "pointer";

    try {
      range.surroundContents(span);
      // Clear selection
      selection.removeAllRanges();
    } catch (e) {
      console.log("Cross-block selection detected, using fallback wrapping");
      const fragment = range.extractContents();
      wrapTextNodes(fragment);
      range.insertNode(fragment);
      selection.removeAllRanges();
    }
  }

  // UI Construction
  function createUI() {
    // Create Panel first
    const panel = document.createElement("div");
    panel.id = "gemini-helper-panel";
    panel.innerHTML = `
            <div id="gemini-helper-header">
                <span>Gemini Helper</span>
                <span style="cursor:pointer" id="gh-close">×</span>
            </div>
            <div class="gh-tabs">
                <div class="gh-tab active" data-tab="templates">Templates</div>
                <div class="gh-tab" data-tab="images">Base Images</div>
            </div>
            <div id="gemini-helper-content">
                <div id="gh-view-templates" class="gh-view active">
                    <input type="text" id="gh-name-input" class="gh-input" placeholder="Template Name">
                    <button id="gh-save-btn" class="gh-btn">Save Current Prompt</button>
                    <div style="margin: 12px 0; border-top: 1px solid #eee;"></div>
                    <div id="gh-list"></div>
                </div>
                <div id="gh-view-images" class="gh-view">
                    <input type="text" id="gh-img-name-input" class="gh-input" placeholder="Image Name">
                    <button id="gh-save-img-btn" class="gh-btn">Save First Image from Editor</button>
                    <div id="gh-images-list" class="gh-grid"></div>
                </div>
                <div id="gh-view-edit" class="gh-view">
                    <div class="gh-toolbar">
                        <button id="gh-mark-btn" class="gh-btn" style="width:auto;margin:0;font-size:12px">Mark Selection as Replaceable</button>
                    </div>
                    <div id="gh-edit-area" contenteditable="true"></div>
                    <div class="gh-item-actions" style="margin-top:12px">
                        <button id="gh-save-edit-btn" class="gh-btn">Save Changes</button>
                        <button id="gh-cancel-edit-btn" class="gh-btn" style="background:#f1f3f4;color:#333">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(panel);

    // Initial Theme Check
    checkTheme();
    setInterval(checkTheme, 2000);

    // Event Listeners for Panel
    document.getElementById("gh-close").addEventListener("click", () => {
      panel.style.display = "none";
    });

    document.getElementById("gh-save-btn").addEventListener("click", () => {
      const name = document.getElementById("gh-name-input").value;
      saveTemplate(name);
    });

    document.getElementById("gh-save-img-btn").addEventListener("click", () => {
      const name = document.getElementById("gh-img-name-input").value;
      saveBaseImage(name);
    });

    // Tab Switching
    panel.querySelectorAll(".gh-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        // Remove active class from all tabs and views
        panel
          .querySelectorAll(".gh-tab")
          .forEach((t) => t.classList.remove("active"));
        panel
          .querySelectorAll(".gh-view")
          .forEach((v) => v.classList.remove("active"));

        // Add active class to clicked tab and corresponding view
        tab.classList.add("active");
        document
          .getElementById(`gh-view-${tab.dataset.tab}`)
          .classList.add("active");

        if (tab.dataset.tab === "images") renderImagesList();
      });
    });

    // Edit View Listeners
    document
      .getElementById("gh-mark-btn")
      .addEventListener("click", markSelection);
    document
      .getElementById("gh-save-edit-btn")
      .addEventListener("click", saveEditedTemplate);
    document
      .getElementById("gh-cancel-edit-btn")
      .addEventListener("click", () => {
        document.getElementById("gh-view-edit").classList.remove("active");
        document.querySelector('[data-tab="templates"]').click();
        document
          .getElementById("gemini-helper-panel")
          .classList.remove("gh-expanded");
      });

    // Initialize Button Injection
    waitForInputArea();
  }

  // Image Management Logic
  async function saveBaseImage(name) {
    const images = getImages();
    if (images.length === 0) {
      alert("No images found in editor!");
      return;
    }

    const targetImg = images[0]; // Take first image
    let src = targetImg.src;

    // Convert to Base64 if blob to ensure persistence
    if (src.startsWith("blob:")) {
      try {
        src = await convertImageToDataUrl(targetImg.element);
      } catch (e) {
        console.error("Failed to convert blob", e);
        alert(
          "Failed to process image. The image might not be fully loaded or accessible."
        );
        return;
      }
    }

    const baseImage = {
      id: Date.now(),
      name: name || "Untitled",
      src: src,
      date: new Date().toISOString(),
    };

    const saved = GM_getValue("gemini_base_images", []);
    saved.unshift(baseImage);
    GM_setValue("gemini_base_images", saved);
    renderImagesList();
    document.getElementById("gh-img-name-input").value = "";
    alert("Image saved!");
  }

  function convertImageToDataUrl(img) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Ensure image is loaded
      if (img.complete && img.naturalWidth > 0) {
        process();
      } else {
        img.onload = process;
        img.onerror = () => reject(new Error("Image failed to load"));
      }

      function process() {
        try {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          reject(err);
        }
      }
    });
  }

  function renderImagesList() {
    const list = document.getElementById("gh-images-list");
    const saved = GM_getValue("gemini_base_images", []);

    list.innerHTML = saved.length
      ? ""
      : '<div style="grid-column:1/-1;text-align:center;color:#999">No saved images</div>';

    saved.forEach((img) => {
      const item = document.createElement("div");
      item.className = "gh-img-item";
      item.innerHTML = `
                <img src="${img.src}">
                <div class="gh-img-delete" title="Delete">×</div>
                <div class="gh-img-name">${img.name}</div>
            `;

      // Click to insert
      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("gh-img-delete")) return;
        insertBaseImage(img.src);
      });

      // Delete
      item.querySelector(".gh-img-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm("Delete this image?")) return;
        const newSaved = GM_getValue("gemini_base_images", []).filter(
          (i) => i.id !== img.id
        );
        GM_setValue("gemini_base_images", newSaved);
        renderImagesList();
      });

      list.appendChild(item);
    });
  }

  function insertBaseImage(src) {
    const editor = getEditor();
    if (!editor) {
      alert(
        "Gemini Helper: Editor input field not found. Please report this issue."
      );
      return;
    }

    // Focus editor first
    editor.focus();

    if (src.startsWith("data:")) {
      try {
        const blob = dataURLtoBlob(src);
        const file = new File([blob], "pasted_image.png", { type: blob.type });

        // Approach 1: Find hidden file input (Most reliable for Angular apps)
        // Usually input[type="file"] is near the upload button or global
        let fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          console.log(
            "Gemini Helper: Found file input, attempting upload via DataTransfer"
          );
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          // Approach 2: Dispatch 'drop' event on the dropzone/editor
          console.log(
            "Gemini Helper: No file input found, trying Drop event on editor"
          );
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          // Firefox security fix: view must be window, but in some contexts (sandbox) it fails.
          // Try-catch block specifically for the event construction to fallback if needed.
          try {
            const dropEvent = new DragEvent("drop", {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer,
              view: window, // This might fail in some Firefox sandbox contexts
            });
            editor.dispatchEvent(dropEvent);
          } catch (err) {
            console.warn(
              "Gemini Helper: DragEvent with view failed, trying without view",
              err
            );
            // Fallback for Firefox strict mode / sandbox
            const dropEvent = new DragEvent("drop", {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer,
            });
            editor.dispatchEvent(dropEvent);
          }

          // Approach 3: Fallback to Paste (Legacy)
          console.log("Gemini Helper: Also dispatching Paste event as backup");
          const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer,
            view: window,
          });
          editor.dispatchEvent(pasteEvent);
        }
      } catch (e) {
        console.error("Gemini Helper: Image insertion failed", e);
      }
    }

    // Close panel
    document.getElementById("gemini-helper-panel").style.display = "none";
  }

  function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  function checkTheme() {
    const panel = document.getElementById("gemini-helper-panel");
    const toggle = document.getElementById("gemini-helper-toggle");
    const isDark =
      document.body.classList.contains("dark-theme") ||
      getComputedStyle(document.body).backgroundColor === "rgb(19, 19, 20)" || // Common Gemini Dark
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (isDark) {
      panel.classList.add("gh-dark-panel");
      if (toggle)
        toggle.style.setProperty("--gemini-helper-icon-color", "#e3e3e3");
      document.body.classList.add("gh-dark-mode");
    } else {
      panel.classList.remove("gh-dark-panel");
      if (toggle)
        toggle.style.setProperty("--gemini-helper-icon-color", "#5f6368");
      document.body.classList.remove("gh-dark-mode");
    }
  }

  function waitForInputArea() {
    const observer = new MutationObserver((mutations, obs) => {
      // Target: .input-buttons-wrapper-bottom
      const target = document.querySelector(".input-buttons-wrapper-bottom");
      if (target && !document.getElementById("gemini-helper-toggle")) {
        injectButton(target);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function injectButton(container) {
    const toggle = document.createElement("div");
    toggle.id = "gemini-helper-toggle";
    toggle.innerHTML = "🍌";
    toggle.title = "Gemini Helper";

    // Insert as first child (leftmost)
    container.insertBefore(toggle, container.firstChild);

    toggle.addEventListener("click", (e) => {
      const panel = document.getElementById("gemini-helper-panel");
      // Position panel near the button
      const rect = toggle.getBoundingClientRect();
      panel.style.bottom = window.innerHeight - rect.top + 10 + "px";
      panel.style.right = window.innerWidth - rect.right - 100 + "px"; // Offset a bit

      // Toggle display
      panel.style.display = panel.style.display === "flex" ? "none" : "flex";
      if (panel.style.display === "flex") renderList();
    });

    checkTheme(); // Apply theme to new button
  }

  function renderList() {
    const list = document.getElementById("gh-list");
    const saved = GM_getValue("gemini_templates", []);

    list.innerHTML = saved.length
      ? ""
      : '<div style="text-align:center;color:#999">No saved templates</div>';

    saved.forEach((t) => {
      const item = document.createElement("div");
      item.className = "gh-item";
      const imgCount = t.images ? t.images.length : 0;
      item.innerHTML = `
                <div class="gh-item-header">
                    <span>${t.name}</span>
                    <span style="font-size:10px;color:#999">${new Date(
                      t.date
                    ).toLocaleDateString()}</span>
                </div>
                <div class="gh-item-preview">
                    ${t.text.substring(0, 50)}${t.text.length > 50 ? "..." : ""}
                    ${
                      imgCount > 0
                        ? `<span class="gh-badge">📷 ${imgCount}</span>`
                        : ""
                    }
                </div>
                <div class="gh-item-actions">
                    <button class="gh-item-btn gh-load" data-id="${
                      t.id
                    }">Load</button>
                    <button class="gh-item-btn gh-edit" data-id="${
                      t.id
                    }">Edit</button>
                    <button class="gh-item-btn gh-delete" data-id="${
                      t.id
                    }">Delete</button>
                </div>
            `;
      list.appendChild(item);
    });

    // Attach handlers
    list.querySelectorAll(".gh-load").forEach((b) => {
      b.addEventListener("click", (e) =>
        loadTemplate(Number(e.target.dataset.id))
      );
    });
    list.querySelectorAll(".gh-edit").forEach((b) => {
      b.addEventListener("click", (e) =>
        editTemplate(Number(e.target.dataset.id))
      );
    });
    list.querySelectorAll(".gh-delete").forEach((b) => {
      b.addEventListener("click", (e) =>
        deleteTemplate(Number(e.target.dataset.id))
      );
    });
  }

  // Initialize
  createUI();
})();
