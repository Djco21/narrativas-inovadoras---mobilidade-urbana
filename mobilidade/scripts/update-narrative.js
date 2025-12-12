import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const DRIVE_URL = 'https://docs.google.com/uc?export=download&id=1-o0LleJ9kcmERDP5eEfd_H_wV0R2FnXy';
// Resolve path relative to this script (assumed to be in /scripts or root? User didn't specify, I'll put it in root/scripts)
// Let's assume this script runs from project root via npm, but let's be safe.
// Target: src/narrative.md
const TARGET_FILE = path.resolve(__dirname, '../src/narrative.md');

async function updateNarrative() {
    console.log('Fetching narrative from Google Drive...');

    try {
        const response = await fetch(DRIVE_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const newContent = await response.text();

        // Check if file exists to read current content
        let currentContent = '';
        if (fs.existsSync(TARGET_FILE)) {
            currentContent = fs.readFileSync(TARGET_FILE, 'utf-8');
        }

        // Compare
        if (newContent !== currentContent) {
            fs.writeFileSync(TARGET_FILE, newContent, 'utf-8');
            console.log('✅ File updated successfully: src/narrative.md');
        } else {
            console.log('✨ No changes detected. File is up to date.');
        }

    } catch (error) {
        console.error('❌ Error updating narrative:', error.message);
        process.exit(1);
    }
}

updateNarrative();
