# Gemini Helper Userscript

A Tampermonkey/Violentmonkey userscript that enhances the Google Gemini interface with template saving and base image management features.

## Features

### Prompt Templates

- Save your current chat prompt (text + images) as a reusable template.
- Restore saved templates with a single click.
- Automatically handles mixed content (text and images).

### Base Images Management

- Save frequently used images (e.g., character reference sheets, style guides) directly from the editor.
- Persistent storage: Converts uploaded blob images to Base64 so they remain available across sessions.
- Visual grid interface to preview and select images.
- One-click insertion of images into the chat input.

## Installation

1. Install a userscript manager extension for your browser (e.g., Tampermonkey, Violentmonkey).
2. Create a new script in the manager.
3. Copy the contents of `gemini-helper.user.js` into the script editor.
4. Save and refresh `gemini.google.com`.

## Usage

1. **Open Panel**: Click the banana icon (🍌) in the input toolbar.
2. **Save Template**: Type a prompt or upload an image, then click "Save Current Prompt" in the "Templates" tab.
3. **Save Base Image**: Upload an image to the input box, switch to the "Base Images" tab, and click "Save First Image from Editor".
4. **Load**: Click "Load" on a template or click an image in the grid to insert it into the chat.
