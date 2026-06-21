/* =============================================
   QCC AI Chatbot — Client-side JS Logic
   ============================================= */

(function () {
    // 1. Inject Stylesheet Link & Critical Style Tag to prevent FOUC
    if (!document.getElementById('qcc-chatbot-style')) {
        const link = document.createElement('link');
        link.id = 'qcc-chatbot-style';
        link.rel = 'stylesheet';
        link.href = '/css/chatbot.css';
        document.head.appendChild(link);

        const style = document.createElement('style');
        style.id = 'qcc-chatbot-fouc-prevent';
        style.innerHTML = '#qcc-chatbot-widget { opacity: 0; pointer-events: none; visibility: hidden; }';
        document.head.appendChild(style);
    }

    // 2. Chatbot Conversation State & Session Management
    let chatHistory = [];
    const maxHistoryLength = 20; // limit history size to save resources

    // Generate or retrieve sessionId from sessionStorage using cryptographically secure UUID
    let sessionId = sessionStorage.getItem('qcc_chatbot_session_id');
    if (!sessionId) {
        sessionId = 'user-' + crypto.randomUUID();
        sessionStorage.setItem('qcc_chatbot_session_id', sessionId);
    }

    // 3. Inject Chatbot Widget HTML
    const widgetHTML = `
        <div id="qcc-chatbot-widget">
            <div class="qcc-chatbot-header">
                <div class="qcc-chatbot-header-info">
                    <span>🤖</span>
                    <div class="qcc-chatbot-header-text">
                        <div class="qcc-chatbot-header-title">Asisten QCC AI</div>
                        <div class="qcc-chatbot-header-status">Online • Halo!</div>
                    </div>
                </div>
                <button id="qcc-chatbot-close" class="qcc-chatbot-close-btn">&times;</button>
            </div>
            <div id="qcc-chatbot-messages" class="qcc-chatbot-messages">
                <div class="qcc-chat-message bot">
                    Halo! Saya Asisten AI spesialis Quality Control (QCC), 5R/5S, dan perbaikan proses manufaktur Toyota. 
                    Ada yang bisa saya bantu tentang grafik Histogram, Scatter Diagram, Pareto, Control Chart, konsep Henkaten, atau line stop?
                </div>
            </div>
            <div class="qcc-chatbot-input-container">
                <input type="text" id="qcc-chatbot-input" placeholder="Tanya tentang QC tools / Henkaten..." />
                <button id="qcc-chatbot-send">Kirim</button>
            </div>
        </div>
    `;

    const chatContainer = document.createElement('div');
    chatContainer.innerHTML = widgetHTML;
    document.body.appendChild(chatContainer.firstElementChild);

    // Get widget references
    const widget = document.getElementById('qcc-chatbot-widget');
    const closeBtn = document.getElementById('qcc-chatbot-close');
    const messagesArea = document.getElementById('qcc-chatbot-messages');
    const chatInput = document.getElementById('qcc-chatbot-input');
    const sendBtn = document.getElementById('qcc-chatbot-send');

    // Toggle Chat Window
    window.toggleChatbot = function (e) {
        if (e) e.preventDefault();
        widget.classList.toggle('qcc-active');
        if (widget.classList.contains('qcc-active')) {
            chatInput.focus();
            scrollToBottom();
        }
    };

    // Close Button Event
    closeBtn.addEventListener('click', () => {
        widget.classList.remove('qcc-active');
    });

    // Send Message Events
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Scroll to Bottom Helper
    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    // Utility to escape HTML entities and prevent DOM-based XSS
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Lightweight Regex-based Markdown-to-HTML parser
    function parseMarkdown(text) {
        let escaped = escapeHTML(text);

        // Convert bold: **text** -> <strong>text</strong>
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Convert italic: *text* -> <em>text</em>
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Split by newlines to process bullet points line-by-line
        const lines = escaped.split('\n');
        let inList = false;
        const resultLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const bulletMatch = line.match(/^(\s*)([*\-•])\s+(.*)$/);

            if (bulletMatch) {
                if (!inList) {
                    inList = true;
                    resultLines.push('<ul>');
                }
                resultLines.push(`<li>${bulletMatch[3]}</li>`);
            } else {
                if (inList) {
                    inList = false;
                    resultLines.push('</ul>');
                }
                resultLines.push(line);
            }
        }
        if (inList) {
            resultLines.push('</ul>');
        }

        // Join lines with <br> selectively to avoid adding extra blank lines around list elements
        let html = '';
        for (let i = 0; i < resultLines.length; i++) {
            const current = resultLines[i];
            const next = resultLines[i + 1];
            html += current;
            if (i < resultLines.length - 1) {
                const isCurrentListTag = /<\/?(ul|li)>/.test(current);
                const isNextListTag = next && /<\/?(ul|li)>/.test(next);
                if (!isCurrentListTag && !isNextListTag) {
                    html += '<br>';
                }
            }
        }
        return html;
    }

    // Add Message Bubble
    function appendMessage(role, text) {
        const msg = document.createElement('div');
        msg.className = `qcc-chat-message ${role}`;
        msg.innerHTML = parseMarkdown(text);
        messagesArea.appendChild(msg);
        scrollToBottom();
    }

    // Send Message Action
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Display user query
        appendMessage('user', text);
        chatInput.value = '';

        // Display bot loading typing dots
        const loader = document.createElement('div');
        loader.id = 'qcc-chatbot-loader';
        loader.className = 'qcc-chat-message bot loading';
        loader.innerHTML = `
            <div class="dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        messagesArea.appendChild(loader);
        scrollToBottom();

        try {
            // Post conversation payload to backend endpoint with sessionId
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    message: text
                })
            });

            const data = await response.json();

            // Remove typing loader
            const loaderEl = document.getElementById('qcc-chatbot-loader');
            if (loaderEl) loaderEl.remove();

            if (response.ok && data.response) {
                // Render bot answer
                appendMessage('bot', data.response);

                // Add to history state
                chatHistory.push({ role: 'user', text: text });
                chatHistory.push({ role: 'bot', text: data.response });

                // Cap history length to avoid huge payload size
                if (chatHistory.length > maxHistoryLength) {
                    chatHistory = chatHistory.slice(chatHistory.length - maxHistoryLength);
                }
            } else {
                appendMessage('bot', `⚠️ Gagal memuat jawaban. ${data.error || 'Silakan coba lagi.'}`);
            }
        } catch (err) {
            console.error('Chatbot API Fetch Error:', err);
            const loaderEl = document.getElementById('qcc-chatbot-loader');
            if (loaderEl) loaderEl.remove();
            appendMessage('bot', '❌ Koneksi terputus. Pastikan server QCC sedang berjalan dan periksa koneksi internet Anda.');
        }
    }

    // 4. Inject Trigger Button dynamically in Header Controls
    function injectTrigger() {
        const headerControls = document.querySelector('.header-controls');
        if (headerControls && !document.getElementById('chatbotTriggerBtn')) {
            // Create desktop navbar button 🤖
            const btn = document.createElement('button');
            btn.id = 'chatbotTriggerBtn';
            btn.className = 'btn-header chatbot-trigger-btn';
            btn.title = 'Tanya Asisten AI Chatbot';
            btn.innerHTML = '🤖';
            btn.addEventListener('click', toggleChatbot);

            // Append as the rightmost item in header controls
            headerControls.appendChild(btn);
        }

        // --- Handle Mobile Bottom-Nav ---
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav && !document.getElementById('mobileChatbotBtn')) {
            const a = document.createElement('a');
            a.id = 'mobileChatbotBtn';
            a.href = '#';
            a.className = 'bnav-item';
            a.title = 'Chatbot AI';
            a.innerHTML = '🤖<span>Chatbot</span>';
            a.addEventListener('click', toggleChatbot);

            // Append to bottom navigation bar on mobile
            bottomNav.appendChild(a);
        }

        // --- Handle Home Page (index.html) Mobile Dropdown ---
        const isHomePage = window.location.pathname.endsWith('index.html') ||
            window.location.pathname.endsWith('/') ||
            document.getElementById('tour-btn-header') !== null;

        if (isHomePage) {
            setupMobileHamburger();
        }
    }

    // Helper: Setup Mobile Hamburger menu for index.html
    function setupMobileHamburger() {
        if (document.getElementById('mobileHamburgerMenuBtn')) return;

        const headerControls = document.querySelector('.header-controls');
        if (!headerControls) return;

        // Create Mobile Hamburger Trigger Button
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.id = 'mobileHamburgerMenuBtn';
        hamburgerBtn.className = 'btn-header mobile-hamburger-btn';
        hamburgerBtn.title = 'Menu Navigasi';
        hamburgerBtn.innerHTML = '☰';

        // Style for hamburger menu wrapper
        const style = document.createElement('style');
        style.innerHTML = `
            #mobileHamburgerMenuBtn { display: none; }
            .mobile-dropdown-menu {
                display: none; position: fixed; right: 16px; top: 75px;
                background-color: var(--card-bg); border: 1px solid var(--primary);
                min-width: 250px; box-shadow: 0px 10px 30px rgba(0,0,0,0.3);
                border-radius: 12px; padding: 10px; z-index: 10000;
                backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
                animation: fadeIn 0.2s ease-out;
            }
            .mobile-dropdown-menu.show { display: flex; flex-direction: column; gap: 8px; }
            
            @media screen and (max-width: 768px) {
                #mobileHamburgerMenuBtn { display: flex; }
                /* Hide other buttons except theme toggle and hamburger */
                .header-controls > *:not(.theme-toggle):not(#mobileHamburgerMenuBtn):not(#chatbotTriggerBtn) {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
        headerControls.appendChild(hamburgerBtn);

        // Create Dropdown Menu element
        const mobileMenu = document.createElement('div');
        mobileMenu.id = 'mobileHamburgerMenu';
        mobileMenu.className = 'mobile-dropdown-menu';
        mobileMenu.innerHTML = `
            <a href="pages/modul.html" class="hamburger-chatbot-item">📘 Modul Pembelajaran</a>
            <div class="hamburger-chatbot-item" onclick="document.getElementById('tour-btn-header').click(); closeHamburger();">🚀 Mulai Tour</div>
            <div class="hamburger-chatbot-item" onclick="document.getElementById('glossary-btn-header').click(); closeHamburger();">📚 Glosarium Lengkap</div>
            <div class="hamburger-chatbot-item" onclick="toggleGuideDropdown(); closeHamburger();">📖 Panduan Penggunaan</div>
            <div class="hamburger-chatbot-item" onclick="toggleChatbot(); closeHamburger();" style="border-top: 1px dashed var(--glass-border); padding-top: 12px; color: var(--primary);">🤖 Tanya Asisten AI</div>
        `;
        document.body.appendChild(mobileMenu);

        // Toggle Hamburger
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('show');
        });

        // Close hamburger when clicking outside
        document.addEventListener('click', () => {
            mobileMenu.classList.remove('show');
        });

        window.closeHamburger = function () {
            mobileMenu.classList.remove('show');
        };

        // Helper to trigger Panduan usage dropdown
        window.toggleGuideDropdown = function () {
            const dropdown = document.getElementById('guideDropdown');
            if (dropdown) dropdown.classList.toggle('show');
        };
    }

    // Run trigger injection on DOM Content Loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectTrigger);
    } else {
        injectTrigger();
    }
})();
