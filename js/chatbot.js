/**
 * Chatbot Widget — Logique principale
 * Compatible OpenAI, Ollama, LM Studio et tout endpoint compatible
 */
(function () {
    'use strict';

    // Nettoyage automatique de l'historique corrompu
    try {
        var stored = localStorage.getItem('chatbot_history');
        if (stored) {
            var data = JSON.parse(stored);
            if (!Array.isArray(data) || data.length > 50) {
                localStorage.removeItem('chatbot_history');
            }
        }
    } catch (_) {
        localStorage.removeItem('chatbot_history');
    }

    var C = CHATBOT_CONFIG;
    var api = C.api;
    var app = C.appearance;
    var adv = C.advanced;
    var wrapper = document.getElementById('chatbotWrapper');
    var toggle = document.getElementById('chatbotToggle');
    var label = document.getElementById('chatbotLabel');
    var container = document.getElementById('chatbotContainer');
    var header = document.getElementById('chatbotHeader');
    var messages = document.getElementById('chatbotMessages');
    var form = document.getElementById('chatbotForm');
    var input = document.getElementById('chatbotInput');
    var sendBtn = document.getElementById('chatbotSend');
    var closeBtn = document.getElementById('chatbotClose');
    var clearBtn = document.getElementById('chatbotClear');
    var isOpen = false;
    var isLoading = false;
    var conversationHistory = [];
    function lighten(hex, pct) {
        var n = parseInt(hex.replace('#', ''), 16);
        var r = Math.min(255, (n >> 16) + Math.round(2.55 * pct));
        var g = Math.min(255, ((n >> 8) & 0xFF) + Math.round(2.55 * pct));
        var b = Math.min(255, (n & 0xFF) + Math.round(2.55 * pct));
        return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
    }
    function escapeHtml(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function getTime() { return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
    function scrollToBottom() { messages.scrollTop = messages.scrollHeight; }
    function parseMarkdown(text) {
        // Sécurisé : regex atomiques pour éviter le backtracking catastrophique
        var html = text
                   .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
                   .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
                   .replace(/`([^`]+)`/g, '<code>$1</code>');
        var lines = html.split('\n');
        var inList = false, result = [];
        for (var i = 0; i < Math.min(lines.length, 100); i++) {
            var m = lines[i].match(/^[-•]\s+(.*)/);
            if (m) {
                if (!inList) { result.push('<ul>'); inList = true; }
                result.push('<li>' + m[1] + '</li>');
            } else {
                if (inList) { result.push('</ul>'); inList = false; }
                if (lines[i].trim()) result.push('<p>' + lines[i] + '</p>');
            }
        }
        if (inList) result.push('</ul>');
        return result.join('');
    }
    function initAppearance() {
        if (app.position === 'bottom-left') wrapper.classList.add('position-bottom-left');
        var root = document.documentElement.style;
        root.setProperty('--chat-primary', app.primaryColor);
        root.setProperty('--chat-user-bg', app.userBubbleBg);
        root.setProperty('--chat-user-text', app.userBubbleText);
        root.setProperty('--chat-bot-bg', app.botBubbleBg);
        root.setProperty('--chat-bot-text', app.botBubbleText);
        header.style.background = 'linear-gradient(135deg, ' + app.primaryColor + ', ' + lighten(app.primaryColor, 30) + ')';
        label.textContent = app.buttonLabel;
        input.placeholder = app.inputPlaceholder;
    }
    function toggleChat() {
        isOpen = !isOpen;
        toggle.classList.toggle('active', isOpen);
        container.classList.toggle('open', isOpen);
        if (isOpen) {
            input.focus();
            if (messages.children.length === 0) {
                loadHistory();
                if (conversationHistory.length === 0) showBotMessage(app.welcomeMessage);
            }
        }
    }
    toggle.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    function showBotMessage(text, save) {
        if (save === undefined) save = true;
        var d = document.createElement('div');
        d.className = 'chat-message bot';
        d.innerHTML = '<div class="msg-avatar">🌿</div><div><div class="msg-bubble">' + parseMarkdown(text) + '</div><div class="msg-time">' + getTime() + '</div></div>';
        messages.appendChild(d); scrollToBottom();
        if (save) { conversationHistory.push({ role: 'assistant', content: text }); saveHistory(); }
    }
    function showUserMessage(text, save) {
        if (save === undefined) save = true;
        var d = document.createElement('div');
        d.className = 'chat-message user';
        d.innerHTML = '<div class="msg-avatar">👤</div><div><div class="msg-bubble"><p>' + escapeHtml(text) + '</p></div><div class="msg-time">' + getTime() + '</div></div>';
        messages.appendChild(d); scrollToBottom();
        if (save) { conversationHistory.push({ role: 'user', content: text }); saveHistory(); }
    }
    function showTyping() {
        var t = document.createElement('div');
        t.className = 'typing-indicator'; t.id = 'typingIndicator';
        t.innerHTML = '<div class="msg-avatar" style="background:var(--chat-bot-bg);">🌿</div><div><div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>';
        messages.appendChild(t); scrollToBottom();
    }
    function hideTyping() { var e = document.getElementById('typingIndicator'); if (e) e.remove(); }
    function showError(text) {
        var d = document.createElement('div');
        d.className = 'chat-message bot';
        d.innerHTML = '<div class="msg-avatar">🌿</div><div><div class="msg-bubble error-msg"><p>⚠️ ' + text + '</p></div></div>';
        messages.appendChild(d); scrollToBottom();
    }
    function saveHistory() {
        if (!adv.enablePersistence) return;
        try { localStorage.setItem('chatbot_history', JSON.stringify(conversationHistory.slice(-adv.maxContextMessages))); } catch (e) {}
    }
    function loadHistory() {
        if (!adv.enablePersistence) return;
        try {
            var s = localStorage.getItem('chatbot_history');
            if (s) {
                var data = JSON.parse(s);
                // Limite la taille pour éviter le timeout
                if (!Array.isArray(data) || data.length > 50) return;
                conversationHistory = data.slice(-adv.maxContextMessages);
                for (var i = 0; i < conversationHistory.length; i++) {
                    var msg = conversationHistory[i];
                    if (msg.role === 'user') showUserMessage(msg.content, false);
                    else showBotMessage(msg.content, false);
                }
            }
        } catch (e) { localStorage.removeItem('chatbot_history'); }
    }
    function clearHistory() {
        conversationHistory = []; messages.innerHTML = '';
        if (adv.enablePersistence) localStorage.removeItem('chatbot_history');
        showBotMessage("💬 Conversation effacée. Comment puis-je vous aider ?");
    }
    clearBtn.addEventListener('click', function() { if (confirm('Effacer toute la conversation ?')) clearHistory(); });
    async function callAPI() {
        var msgs = [{ role: 'system', content: C.systemPrompt }];
        msgs = msgs.concat(conversationHistory.slice(-adv.maxContextMessages));
        var hdrs = { 'Content-Type': 'application/json' };
        for (var k in api.customHeaders) { hdrs[k] = api.customHeaders[k]; }
        if (api.apiKey) {
            if (api.authHeader) {
                hdrs[api.authHeader] = api.apiKey;
            } else {
                hdrs['Authorization'] = 'Bearer ' + api.apiKey;
            }
        }
        var body = { model: api.model, messages: msgs, temperature: api.temperature, max_tokens: api.maxTokens };

        console.log('[Chatbot] Envoi à:', api.url);

        var res;
        try {
            res = await fetch(api.url, { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
        } catch (netErr) {
            console.error('[Chatbot] Erreur réseau:', netErr);
            throw new Error('Erreur réseau : ' + netErr.message);
        }

        console.log('[Chatbot] Status:', res.status);
        var rawText = await res.text();

        if (!res.ok) {
            throw new Error('Erreur API (' + res.status + '): ' + rawText.substring(0, 200));
        }

        var data;
        try {
            data = JSON.parse(rawText);
        } catch (parseErr) {
            return rawText.trim();
        }

        var reply = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
            reply = data.choices[0].message.content;
        } else if (data.message) {
            reply = data.message.content || data.message;
        } else if (data.response) {
            reply = data.response;
        } else if (data.text) {
            reply = data.text;
        } else if (data.output) {
            reply = data.output;
        } else if (data.generated_text) {
            reply = data.generated_text;
        } else {
            for (var key in data) {
                if (typeof data[key] === 'string' && data[key].length > 20) {
                    reply = data[key];
                    break;
                }
            }
        }

        if (!reply) {
            console.warn('[Chatbot] Réponse inattendue:', rawText.substring(0, 200));
            reply = "Desole, je n'ai pas repondu correctement. Réessayer ?";
        }
        return reply.trim();
    }
    async function handleSubmit(e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text || isLoading) return;
        isLoading = true; sendBtn.disabled = true; input.value = '';
        showUserMessage(text); showTyping();
        try {
            var reply = await callAPI();
            hideTyping(); showBotMessage(reply);
        } catch (err) {
            hideTyping();
            if (err.message.indexOf('Erreur API') !== -1) {
                showError('Impossible de contacter le serveur IA. Verifiez votre configuration dans js/config.js.');
            } else {
                showError('Erreur: ' + escapeHtml(err.message));
            }
        } finally {
            isLoading = false; sendBtn.disabled = false; input.focus();
        }
    }
    form.addEventListener('submit', handleSubmit);
    if (adv.autoOpen) {
        setTimeout(function() { if (!isOpen) toggleChat(); }, 2000 + (adv.autoOpenDelay || 0));
    }
    (function() {
        var nt = document.getElementById('navToggle');
        var nl = document.getElementById('navLinks');
        if (nt && nl) {
            nt.addEventListener('click', function() { nl.classList.toggle('active'); });
            nl.querySelectorAll('a').forEach(function(l) { l.addEventListener('click', function() { nl.classList.remove('active'); }); });
        }
    })();
    (function() {
        var he = document.getElementById('header');
        if (he) { window.addEventListener('scroll', function() { he.classList.toggle('scrolled', window.scrollY > 50); }, { passive: true }); }
    })();
    (function() {
        var cf = document.getElementById('contactForm');
        if (cf) { cf.addEventListener('submit', function(e) { e.preventDefault(); alert('Merci pour votre demande ! Nous vous repondrons sous 24h.'); cf.reset(); }); }
    })();
    initAppearance();
})();




