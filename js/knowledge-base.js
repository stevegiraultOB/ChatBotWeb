const fs   = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Chargement asynchrone de pdf-parse (depend de node-ffi)
let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch(e) {
    console.log('[KB] pdf-parse non disponible - PDF non supports');
}

const DOCS_DIR = path.join(__dirname, '..', 'docs');

/**
 * Lit un fichier texte (.txt, .md, .csv, .json, .log)
 */
async function readTextFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
}

/**
 * Lit un document Word (.docx)
 */
async function readDocxFile(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}

/**
 * Lit un fichier PDF
 */
async function readPdfFile(filePath) {
    if (!pdfParse) return '[PDF: module non disponible]';
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch(e) {
        return '[PDF: erreur de lecture - ' + e.message + ']';
    }
}

/**
 * Lit les metadata d'une image
 */
async function readImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    return `[Image: ${path.basename(filePath)} | Format: ${ext} | Taille: ${Math.round(stats.size / 1024)} Ko]`;
}

/**
 * Lit tous les documents du dossier docs/ et retourne le contenu concatene
 */
async function loadKnowledgeBase() {
    if (!fs.existsSync(DOCS_DIR)) {
        console.log('[KB] Dossier docs/ non trouve');
        return '';
    }

    const files = fs.readdirSync(DOCS_DIR)
        .filter(f => !f.startsWith('.') && !f.includes('node_modules'));

    if (files.length === 0) {
        console.log('[KB] Aucun document trouve dans docs/');
        return '';
    }

    console.log('[KB] Documents trouves:', files.length);
    const results = [];

    for (const file of files) {
        const filePath = path.join(DOCS_DIR, file);
        const ext = path.extname(file).toLowerCase();

        try {
            let content = '';
            switch (ext) {
                case '.txt':
                case '.md':
                case '.csv':
                case '.json':
                case '.log':
                case '.yaml':
                case '.yml':
                    content = await readTextFile(filePath);
                    break;

                case '.docx':
                    content = await readDocxFile(filePath);
                    break;

                case '.pdf':
                    content = await readPdfFile(filePath);
                    break;

                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.gif':
                case '.webp':
                    content = await readImageFile(filePath);
                    break;

                default:
                    continue; // Ignorer les fichiers non supportes
            }

            // Tronquer les tres longs contenus (max 4000 caracteres par fichier)
            const maxLen = 4000;
            if (content.length > maxLen) {
                content = content.substring(0, maxLen) + '\n\n... [contenu tronque]';
            }

            results.push(`--- DOCUMENT: ${file} ---\n${content}`);
            console.log(`[KB] Charge: ${file} (${content.length} caracteres)`);
        } catch (err) {
            console.error(`[KB] Erreur lecture ${file}:`, err.message);
        }
    }

    return results.join('\n\n');
}

/**
 * Cache - ne re-charge que si les fichiers ont change
 */
let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute

async function getKnowledgeBase() {
    const now = Date.now();

    // Si le cache est valide, le retourner
    if (cache !== null && now - cacheTime < CACHE_DURATION) {
        return cache;
    }

    // Re-charger
    cache = await loadKnowledgeBase();
    cacheTime = now;

    return cache;
}

module.exports = { getKnowledgeBase, loadKnowledgeBase };
