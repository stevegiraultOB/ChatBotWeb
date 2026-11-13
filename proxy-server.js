/**
 * Proxy local pour le chatbot - utilise le SDK OpenAI officiel
 * Usage : node proxy-server.js
 * 
 * Charge automatiquement les documents du dossier docs/ et les injecte
 * dans le prompt systeme pour enrichir les reponses du chatbot.
 */
const http = require('http');
const path = require('path');
const { OpenAI } = require('openai');
const { getKnowledgeBase } = require('./js/knowledge-base');

const PORT = 3456;
const client = new OpenAI({
  apiKey: 'sk-K9BlFWt7GP6EoXh8lwMWsQ',
  baseURL: 'https://api.liveintelligence.orange-business.com/public/ai',
});

const systemPrompt = `Tu es "Live Intelligence - EcoBot", l'assistant virtuel d'EcoVert Solutions, une entreprise francaise specialisee dans les services de nettoyage ecologique pour les entreprises et particuliers depuis 2015.

Ton role : aider les visiteurs du site a trouver les informations qu'ils cherchent sur nos services, tarifs, zones d'intervention et engagements ecologiques.

Sois amical, professionnel et concis. Reponds toujours en francais.`;

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'POST' || req.url !== '/ai') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Utilisez POST /ai' }));
        return;
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString()); }
        catch (_) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'JSON invalide' }));
            return;
        }

        console.log('[Proxy] -> model:', parsed.model, '| messages:', parsed.messages?.length);

        // Charger la base de connaissances et l'injecter dans le system prompt
        try {
            const kb = await getKnowledgeBase();
            if (kb && kb.trim().length > 0) {
                // Trouver et enrichir le message system existant ou en creer un
                let hasSystemMessage = false;
                if (Array.isArray(parsed.messages)) {
                    for (const msg of parsed.messages) {
                        if (msg.role === 'system') {
                            msg.content = systemPrompt + '\n\n' +
                                '=== DOCUMENTS DE REFERENCE ===\n' +
                                'Utilise les informations ci-dessous pour completer tes reponses.\n' +
                                'Ces documents contiennent des informations supplementaires sur notre entreprise :\n\n' +
                                kb;
                            hasSystemMessage = true;
                            console.log('[Proxy] Base de connaissances injectee (' + kb.length + ' caracteres)');
                            break;
                        }
                    }
                    // Si pas de message system, en ajouter un
                    if (!hasSystemMessage) {
                        parsed.messages.unshift({
                            role: 'system',
                            content: systemPrompt + '\n\n' +
                                '=== DOCUMENTS DE REFERENCE ===\n' +
                                'Utilise les informations ci-dessous pour completer tes reponses :\n\n' +
                                kb
                        });
                        console.log('[Proxy] Message system avec KB ajoute');
                    }
                }
            }
        } catch (kbErr) {
            console.error('[Proxy] Erreur chargement KB:', kbErr.message);
        }

        try {
            const response = await client.chat.completions.create(parsed);
            console.log('[Proxy] <- OK (', response.usage?.total_tokens, 'tokens)');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        } catch (err) {
            console.error('[Proxy] Erreur:', err.status || 'inconnu', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Erreur API' }));
        }
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  ==================================================');
    console.log('  Proxy Chatbot  ->  http://localhost:' + PORT + '/ai');
    console.log('  Moteur : SDK OpenAI + Orange Live Intelligence');
    console.log('  Modele : live_intelligence/qwen3.6-27b');
    console.log('  Base de connaissances : dossier docs/');
    console.log('  ==================================================');
    console.log('  Ouvrez : http://127.0.0.1:5500/index.html');
    console.log('  (gardez ce terminal ouvert)');
    console.log('');
});
