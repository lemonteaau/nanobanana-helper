// ==UserScript==
// @name         Gemini Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
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
    `);

  // Helper function to get the editor
  function getEditor() {
    return document.querySelector(".ql-editor");
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
      })
    );

    // 2. Images uploaded as files (thumbnails)
    // This is tricky as selectors change. We look for images with blob: or specific classes near the input.
    // Heuristic: Look for images in the same container as the editor that are not icons.
    // The container ref in snapshot was generic[ref=e79]
    // We will try to find images that look like user content (blob:)
    const potentialUploads = Array.from(
      document.querySelectorAll('img[src^="blob:"], img[src^="data:image/"]')
    );

    // Filter out the ones inside editor since we already got them
    const uploads = potentialUploads
      .filter((img) => !editor.contains(img))
      .map((img) => ({
        type: "upload",
        src: img.src,
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
    editor.innerHTML = template.content;

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
            <div id="gemini-helper-content">
                <input type="text" id="gh-name-input" class="gh-input" placeholder="Template Name">
                <button id="gh-save-btn" class="gh-btn">Save Current Prompt</button>
                <div style="margin: 12px 0; border-top: 1px solid #eee;"></div>
                <div id="gh-list"></div>
            </div>
        `;
    document.body.appendChild(panel);

    // Initial Theme Check
    checkTheme();
    // Periodically check theme as it might change
    setInterval(checkTheme, 2000);

    // Event Listeners for Panel
    document.getElementById("gh-close").addEventListener("click", () => {
      panel.style.display = "none";
    });

    document.getElementById("gh-save-btn").addEventListener("click", () => {
      const name = document.getElementById("gh-name-input").value;
      saveTemplate(name);
    });

    // Initialize Button Injection
    waitForInputArea();
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
    list.querySelectorAll(".gh-delete").forEach((b) => {
      b.addEventListener("click", (e) =>
        deleteTemplate(Number(e.target.dataset.id))
      );
    });
  }

  // Initialize
  createUI();
})();
