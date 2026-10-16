/**
 * Speed Assignment - Real-Time Human Live Support Chat Widget
 * 
 * Provides a responsive, floating human-support live chat positioned
 * in the BOTTOM-LEFT CORNER of the viewport.
 * 
 * Requirements:
 * - Pre-chat form requiring customer's Full Name and Mobile Number before chat starts
 * - Both fields validated and required; sending messages blocked until completed
 * - Customer session persistence across refreshes and page navigations
 * - Real-time two-way messaging with Socket.IO
 * - True agent presence indicator (Agents Online vs Offline / Leave a message)
 * - Clear distinction of human agents from automated chatbot
 * - Bottom-left positioning with zero interference with bottom-right AI chatbot
 */

(function () {
    'use strict';

    // Prevent double initialization
    if (window.__SPEED_ASSIGNMENT_LIVE_SUPPORT_INITIALIZED__) return;
    window.__SPEED_ASSIGNMENT_LIVE_SUPPORT_INITIALIZED__ = true;

    // Configuration & Endpoints
    var defaultApiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0' || window.location.protocol === 'file:')
        ? 'http://localhost:5001/api'
        : '/api';
    var API_BASE = (window.ASSIGNMENTGHAR_API_URL || defaultApiBase).replace(/\/+$/, '');
    var SOCKET_URL = API_BASE.replace(/\/api\/?$/, '') || window.location.origin;

    var STORAGE_SESSION_KEY = 'speedassignment_support_session';
    var STORAGE_OPEN_KEY = 'speedassignment_support_open';
    var STORAGE_CONTACT_KEY = 'speedassignment_support_contact';

    // State Variables
    var sessionToken = localStorage.getItem(STORAGE_SESSION_KEY) || null;
    var conversation = null;
    var messages = [];
    var socket = null;
    var isOpen = false;
    var isOnline = false;
    var onlineCount = 0;
    var isSending = false;
    var unreadCount = 0;
    var typingTimer = null;
    var isCustomerTyping = false;

    // Contact info stored locally for prefilling
    var cachedContact = {};
    try {
        var rawContact = localStorage.getItem(STORAGE_CONTACT_KEY);
        if (rawContact) cachedContact = JSON.parse(rawContact) || {};
    } catch (e) {}

    // HTML escape utility
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Format text with URLs and newlines safely
    function formatMessageContent(text) {
        if (!text) return '';
        var escaped = escapeHtml(text);
        var urlRegex = /(https?:\/\/[^\s<]+)/g;
        escaped = escaped.replace(urlRegex, function (url) {
            return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:underline; font-weight:600;">' + url + '</a>';
        });
        return escaped.replace(/\n/g, '<br>');
    }

    // Format timestamp
    function formatTime(isoString) {
        if (!isoString) return '';
        try {
            var date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    // Check if the current conversation has completed the required pre-chat identification
    function isCustomerIdentified() {
        if (!conversation) return false;
        var name = conversation.customerName;
        var phone = conversation.customerPhone;
        if (!name || name === 'Visitor' || name.trim().length < 2) return false;
        if (!phone) return false;
        var digits = phone.replace(/\D/g, '');
        if (digits.length < 7) return false;
        return true;
    }

    // DOM Elements cache
    var dom = {};

    function buildWidgetDOM() {
        // 1. Floating Launcher (Bottom-Left Corner)
        var launcher = document.createElement('button');
        launcher.id = 'liveSupportLauncher';
        launcher.className = 'live-support-launcher';
        launcher.type = 'button';
        launcher.setAttribute('aria-label', 'Open Live Chat with Experts');
        launcher.setAttribute('aria-expanded', 'false');
        launcher.innerHTML = [
            '<span class="live-support-launcher-icon"><i class="bi bi-chat-dots-fill"></i></span>',
            '<span class="live-support-presence-dot" id="liveSupportLauncherDot"></span>',
            '<span class="live-support-launcher-label">Live Chat with Experts</span>',
            '<span class="live-support-badge d-none" id="liveSupportBadge">0</span>'
        ].join('');

        // 2. Chat Panel (Bottom-Left Corner)
        var panel = document.createElement('div');
        panel.id = 'liveSupportPanel';
        panel.className = 'live-support-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-labelledby', 'liveSupportTitle');
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = [
            '<div class="live-support-header">',
            '    <div class="live-support-header-info">',
            '        <div class="live-support-header-icon"><i class="bi bi-chat-dots-fill"></i></div>',
            '        <div>',
            '            <h4 class="live-support-title" id="liveSupportTitle">Live Chat with Experts</h4>',
            '            <div class="live-support-subtitle" id="liveSupportSubtitle">',
            '                <span class="live-support-status-indicator" id="liveSupportHeaderDot"></span>',
            '                <span id="liveSupportCustomerMeta">Connect with academic experts</span>',
            '            </div>',
            '        </div>',
            '    </div>',
            '    <div class="live-support-header-actions">',
            '        <button type="button" class="live-support-btn-icon" id="liveSupportCloseBtn" title="Close" aria-label="Close">',
            '            <i class="bi bi-x-lg"></i>',
            '        </button>',
            '    </div>',
            '</div>',
            '',
            '<div class="live-support-banner" id="liveSupportBanner"></div>',
            '',
            '<!-- Mandatory Pre-Chat Screening Screen -->',
            '<div class="live-support-prechat-screen" id="liveSupportPrechatScreen">',
            '    <div class="live-support-prechat-hero">',
            '        <div class="live-support-prechat-icon"><i class="bi bi-chat-dots-fill"></i></div>',
            '        <h4 class="live-support-prechat-title">Live Chat with Experts</h4>',
            '        <p class="live-support-prechat-subtitle">Please enter your name and mobile number to start chatting with an expert.</p>',
            '    </div>',
            '    <div class="live-support-prechat-alert" id="liveSupportPreAlert"></div>',
            '    <form id="liveSupportPrechatForm" novalidate>',
            '        <div class="live-support-form-group">',
            '            <label class="live-support-form-label" for="liveSupportPreName">Full Name <span style="color:#DC2626;">*</span></label>',
            '            <input type="text" id="liveSupportPreName" class="live-support-form-input" placeholder="Enter full name" maxlength="80" autocomplete="name" required>',
            '            <div class="live-support-field-error" id="liveSupportPreNameError">Please enter your full name.</div>',
            '        </div>',
            '        <div class="live-support-form-group">',
            '            <label class="live-support-form-label" for="liveSupportPrePhone">Mobile Number <span style="color:#DC2626;">*</span></label>',
            '            <input type="tel" id="liveSupportPrePhone" class="live-support-form-input" placeholder="Enter mobile number" maxlength="25" autocomplete="tel" required>',
            '            <div class="live-support-field-error" id="liveSupportPrePhoneError">Please enter your mobile number.</div>',
            '        </div>',
            '        <button type="submit" class="live-support-prechat-submit" id="liveSupportPreSubmit">',
            '            <span id="liveSupportPreSubmitText">Start Chat</span>',
            '            <i class="bi bi-arrow-right-short" style="font-size:1.2rem;"></i>',
            '        </button>',
            '    </form>',
            '</div>',
            '',
            '<!-- Chat Messages Container -->',
            '<div class="live-support-messages" id="liveSupportMessages" style="display:none;">',
            '    <div class="live-support-typing" id="liveSupportTyping">',
            '        <span style="font-size:0.75rem; color:#64748B; margin-right:4px;">Expert is typing</span>',
            '        <span class="live-support-typing-dot"></span>',
            '        <span class="live-support-typing-dot"></span>',
            '        <span class="live-support-typing-dot"></span>',
            '    </div>',
            '</div>',
            '',
            '<!-- Chat Composer Footer -->',
            '<div class="live-support-footer" id="liveSupportFooter" style="display:none;">',
            '    <form id="liveSupportForm" class="live-support-input-row">',
            '        <textarea id="liveSupportTextarea" class="live-support-textarea" placeholder="Type a message..." rows="1" maxlength="2000" disabled></textarea>',
            '        <button type="submit" id="liveSupportSendBtn" class="live-support-send-btn" aria-label="Send message" disabled>',
            '            <i class="bi bi-send-fill"></i>',
            '        </button>',
            '    </form>',
            '</div>',
            '<div class="live-support-ended-notice" id="liveSupportEndedNotice" style="display:none;">',
            '    <i class="bi bi-info-circle me-1"></i>This conversation has ended.',
            '</div>'
        ].join('\n');

        document.body.appendChild(launcher);
        document.body.appendChild(panel);

        // Cache elements
        dom.launcher = launcher;
        dom.launcherDot = document.getElementById('liveSupportLauncherDot');
        dom.badge = document.getElementById('liveSupportBadge');
        dom.panel = panel;
        dom.headerDot = document.getElementById('liveSupportHeaderDot');
        dom.customerMeta = document.getElementById('liveSupportCustomerMeta');
        dom.closeBtn = document.getElementById('liveSupportCloseBtn');
        dom.banner = document.getElementById('liveSupportBanner');

        // Pre-chat form elements
        dom.prechatScreen = document.getElementById('liveSupportPrechatScreen');
        dom.prechatForm = document.getElementById('liveSupportPrechatForm');
        dom.preName = document.getElementById('liveSupportPreName');
        dom.prePhone = document.getElementById('liveSupportPrePhone');
        dom.preNameError = document.getElementById('liveSupportPreNameError');
        dom.prePhoneError = document.getElementById('liveSupportPrePhoneError');
        dom.preSubmit = document.getElementById('liveSupportPreSubmit');
        dom.preSubmitText = document.getElementById('liveSupportPreSubmitText');
        dom.preAlert = document.getElementById('liveSupportPreAlert');

        // Chat elements
        dom.messagesContainer = document.getElementById('liveSupportMessages');
        dom.typingIndicator = document.getElementById('liveSupportTyping');
        dom.footer = document.getElementById('liveSupportFooter');
        dom.endedNotice = document.getElementById('liveSupportEndedNotice');
        dom.chatForm = document.getElementById('liveSupportForm');
        dom.textarea = document.getElementById('liveSupportTextarea');
        dom.sendBtn = document.getElementById('liveSupportSendBtn');

        // Populate cached values into inputs
        if (cachedContact.name && dom.preName) {
            dom.preName.value = cachedContact.name;
        }
        if (cachedContact.phone && dom.prePhone) {
            dom.prePhone.value = cachedContact.phone;
        }
    }

    // Update screen state depending on pre-chat status
    function updateScreenState() {
        var identified = isCustomerIdentified();

        if (identified) {
            // Customer is identified: show chat view and enable composer
            if (dom.prechatScreen) dom.prechatScreen.style.display = 'none';
            if (dom.messagesContainer) dom.messagesContainer.style.display = 'flex';

            // Subtly display customer's name and mobile number beneath heading
            var cName = (conversation && conversation.customerName) || (dom.preName && dom.preName.value.trim()) || '';
            var cPhone = (conversation && conversation.customerPhone) || (dom.prePhone && dom.prePhone.value.trim()) || '';
            if (dom.customerMeta) {
                if (cName && cPhone) {
                    dom.customerMeta.textContent = cName + ' • ' + cPhone;
                } else {
                    dom.customerMeta.textContent = cName || cPhone || 'Connected';
                }
            }

            var isEnded = conversation && (conversation.status === 'RESOLVED' || conversation.status === 'CLOSED');
            if (isEnded) {
                if (dom.footer) dom.footer.style.display = 'none';
                if (dom.endedNotice) dom.endedNotice.style.display = 'block';
                if (dom.textarea) dom.textarea.disabled = true;
                if (dom.sendBtn) dom.sendBtn.disabled = true;
            } else {
                if (dom.footer) dom.footer.style.display = 'flex';
                if (dom.endedNotice) dom.endedNotice.style.display = 'none';
                if (dom.textarea) dom.textarea.disabled = false;
            }
        } else {
            // Customer not yet identified: show pre-chat screen, hide messages and hide/disable composer
            if (dom.prechatScreen) dom.prechatScreen.style.display = 'flex';
            if (dom.messagesContainer) dom.messagesContainer.style.display = 'none';
            if (dom.footer) dom.footer.style.display = 'none';
            if (dom.endedNotice) dom.endedNotice.style.display = 'none';
            if (dom.textarea) dom.textarea.disabled = true;
            if (dom.sendBtn) dom.sendBtn.disabled = true;
            if (dom.customerMeta) {
                dom.customerMeta.textContent = 'Connect with academic experts';
            }
        }
    }

    // Update Presence UI
    function updatePresenceUI(online, count) {
        isOnline = !!online;
        onlineCount = count || 0;

        if (dom.launcherDot) {
            if (isOnline) {
                dom.launcherDot.classList.add('online');
            } else {
                dom.launcherDot.classList.remove('online');
            }
        }

        if (dom.headerDot) {
            if (isOnline) {
                dom.headerDot.classList.add('online');
            } else {
                dom.headerDot.classList.remove('online');
            }
        }

        if (!isCustomerIdentified() && dom.customerMeta) {
            if (isOnline) {
                dom.customerMeta.textContent = 'Experts Online • Fast replies';
            } else {
                dom.customerMeta.textContent = 'Leave a message for experts';
            }
        }
    }

    // Toggle Chat Window
    function openPanel() {
        isOpen = true;
        dom.panel.classList.add('open');
        dom.panel.setAttribute('aria-hidden', 'false');
        dom.launcher.setAttribute('aria-expanded', 'true');
        dom.launcher.style.display = 'none';
        localStorage.setItem(STORAGE_OPEN_KEY, '1');

        unreadCount = 0;
        updateBadge();

        updateScreenState();

        if (isCustomerIdentified()) {
            if (sessionToken) {
                markConversationRead();
            }
            scrollToBottom();
            setTimeout(function () {
                if (dom.textarea && !dom.textarea.disabled) dom.textarea.focus();
            }, 80);
        } else {
            setTimeout(function () {
                if (dom.preName) dom.preName.focus();
            }, 80);
        }
    }

    function closePanel() {
        isOpen = false;
        dom.panel.classList.remove('open');
        dom.panel.setAttribute('aria-hidden', 'true');
        dom.launcher.setAttribute('aria-expanded', 'false');
        dom.launcher.style.display = 'inline-flex';
        localStorage.removeItem(STORAGE_OPEN_KEY);
    }

    function togglePanel() {
        if (isOpen) {
            closePanel();
        } else {
            openPanel();
        }
    }

    function updateBadge() {
        if (!dom.badge) return;
        if (unreadCount > 0) {
            dom.badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            dom.badge.classList.remove('d-none');
        } else {
            dom.badge.classList.add('d-none');
        }
    }

    function showBanner(text, type) {
        if (!dom.banner) return;
        if (!text) {
            dom.banner.style.display = 'none';
            dom.banner.className = 'live-support-banner';
            dom.banner.textContent = '';
            return;
        }
        dom.banner.textContent = text;
        dom.banner.className = 'live-support-banner ' + (type || 'warn');
        dom.banner.style.display = 'block';
    }

    function scrollToBottom() {
        if (!dom.messagesContainer) return;
        setTimeout(function () {
            dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
        }, 30);
    }

    // Render single message item: clean WhatsApp style bubble with subtle timestamp
    function appendMessageElement(msg) {
        if (!msg || !msg.id) return;
        var existing = document.getElementById('support-msg-' + msg.id);
        if (existing) return;

        var senderType = (msg.senderType || 'CUSTOMER').toUpperCase();
        var msgDiv = document.createElement('div');
        msgDiv.id = 'support-msg-' + msg.id;
        msgDiv.className = 'live-support-msg ' + senderType.toLowerCase();

        var timeStr = formatTime(msg.createdAt);
        var textBody = msg.text || msg.content || '';

        if (senderType === 'SYSTEM') {
            msgDiv.innerHTML = [
                '<div class="live-support-bubble">',
                '    <span>' + formatMessageContent(textBody) + '</span>',
                '</div>'
            ].join('');
        } else {
            // Clean WhatsApp message bubble without unnecessary labels or tags
            msgDiv.innerHTML = [
                '<div class="live-support-bubble">',
                '    ' + formatMessageContent(textBody),
                '</div>',
                '<div class="live-support-time">' + timeStr + '</div>'
            ].join('');
        }

        // Insert before typing indicator
        if (dom.typingIndicator && dom.typingIndicator.parentNode === dom.messagesContainer) {
            dom.messagesContainer.insertBefore(msgDiv, dom.typingIndicator);
        } else {
            dom.messagesContainer.appendChild(msgDiv);
        }

        scrollToBottom();
    }

    // Render all messages
    function renderMessages(messageList) {
        var nodes = dom.messagesContainer.querySelectorAll('.live-support-msg');
        nodes.forEach(function (n) { n.remove(); });

        if (!messageList || messageList.length === 0) {
            var introDiv = document.createElement('div');
            introDiv.className = 'live-support-msg agent intro-bubble';
            introDiv.innerHTML = [
                '<div class="live-support-bubble">',
                '    Hello! Welcome to Live Chat with Experts. How can our academic experts assist you today?',
                '</div>',
                '<div class="live-support-time">Just now</div>'
            ].join('');
            dom.messagesContainer.insertBefore(introDiv, dom.typingIndicator);
            return;
        }

        messageList.forEach(function (msg) {
            appendMessageElement(msg);
        });
        scrollToBottom();
    }

    // Pre-Chat Form Validation: Full name & Mobile number are mandatory
    function validatePrechatForm() {
        var name = (dom.preName.value || '').trim();
        var phone = (dom.prePhone.value || '').trim();
        var isValid = true;

        // Full Name: required, min 2 chars, max 80 chars
        if (!name || name.length < 2) {
            dom.preName.classList.add('is-invalid');
            dom.preNameError.textContent = 'Please enter your full name.';
            dom.preNameError.classList.add('active');
            isValid = false;
        } else {
            dom.preName.classList.remove('is-invalid');
            dom.preNameError.classList.remove('active');
        }

        // Mobile Number: required, min 7 digits, max 25 chars
        var digitsOnly = phone.replace(/\D/g, '');
        if (!phone || digitsOnly.length < 7 || digitsOnly.length > 16) {
            dom.prePhone.classList.add('is-invalid');
            dom.prePhoneError.textContent = 'Please enter your mobile number.';
            dom.prePhoneError.classList.add('active');
            isValid = false;
        } else {
            dom.prePhone.classList.remove('is-invalid');
            dom.prePhoneError.classList.remove('active');
        }

        return isValid;
    }

    // Handle Pre-Chat Form Submission
    async function handlePrechatSubmit(e) {
        if (e) e.preventDefault();
        if (!validatePrechatForm()) return;

        var name = dom.preName.value.trim();
        var phone = dom.prePhone.value.trim();

        dom.preSubmit.disabled = true;
        var originalBtnHtml = dom.preSubmit.innerHTML;
        dom.preSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> <span class="ms-1">Connecting...</span>';
        dom.preAlert.style.display = 'none';

        try {
            var payload = {
                customerName: name,
                customerPhone: phone
            };
            if (sessionToken) {
                payload.sessionToken = sessionToken;
            }

            var res = await fetch(API_BASE + '/support/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            var result = await res.json();
            if (res.ok && result.success && result.data && result.data.conversation) {
                sessionToken = result.data.sessionToken;
                localStorage.setItem(STORAGE_SESSION_KEY, sessionToken);

                cachedContact = { name: name, phone: phone };
                localStorage.setItem(STORAGE_CONTACT_KEY, JSON.stringify(cachedContact));

                conversation = result.data.conversation;
                messages = (conversation && conversation.messages) || [];

                if (result.data.agentStatus) {
                    updatePresenceUI(result.data.agentStatus.isOnline, result.data.agentStatus.onlineAgentCount);
                }

                // Transition to chat view
                updateScreenState();
                renderMessages(messages);

                // Connect Socket.IO
                connectSocket();

                // Focus textarea for immediate messaging
                setTimeout(function () {
                    if (dom.textarea && !dom.textarea.disabled) dom.textarea.focus();
                }, 100);
            } else {
                dom.preAlert.textContent = result.message || 'Unable to start chat. Please verify your details.';
                dom.preAlert.style.display = 'block';
            }
        } catch (err) {
            console.error('[Live Chat] Error starting pre-chat:', err);
            dom.preAlert.textContent = 'Connection error. Please check your internet connection.';
            dom.preAlert.style.display = 'block';
        } finally {
            dom.preSubmit.disabled = false;
            dom.preSubmit.innerHTML = originalBtnHtml;
        }
    }

    // Session Initialization on page load
    async function initSession() {
        try {
            // First check presence status
            fetch(API_BASE + '/support/status')
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res && res.success && res.data) {
                        updatePresenceUI(res.data.isOnline, res.data.onlineAgentCount);
                    }
                })
                .catch(function () {});

            // If existing sessionToken stored, attempt to restore conversation
            if (sessionToken) {
                var res = await fetch(API_BASE + '/support/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionToken: sessionToken })
                });

                if (res.ok) {
                    var result = await res.json();
                    if (result.success && result.data && result.data.conversation) {
                        conversation = result.data.conversation;
                        messages = (conversation && conversation.messages) || [];

                        if (conversation.customerName && dom.preName) {
                            dom.preName.value = conversation.customerName;
                        }
                        if (conversation.customerPhone && dom.prePhone) {
                            dom.prePhone.value = conversation.customerPhone;
                        }

                        if (result.data.agentStatus) {
                            updatePresenceUI(result.data.agentStatus.isOnline, result.data.agentStatus.onlineAgentCount);
                        }

                        updateScreenState();

                        if (isCustomerIdentified()) {
                            renderMessages(messages);
                            connectSocket();
                        }
                        return;
                    }
                }
            }

            // Not yet identified: show pre-chat screen
            updateScreenState();
        } catch (err) {
            console.error('[Live Support] Error initializing session:', err);
            updateScreenState();
        }
    }

    // Connect Socket.IO
    function connectSocket() {
        if (!window.io) {
            console.warn('[Live Support] Socket.IO client library not loaded. Falling back to HTTP polling.');
            return;
        }

        if (socket) {
            try { socket.disconnect(); } catch (e) {}
        }

        socket = window.io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            auth: {
                sessionToken: sessionToken
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });

        socket.on('connect', function () {
            showBanner(null);
            if (sessionToken) {
                socket.emit('customer:join', { sessionToken: sessionToken }, function (res) {
                    if (res && res.success && res.conversation) {
                        conversation = res.conversation;
                        updateScreenState();
                        if (res.conversation.messages) {
                            messages = res.conversation.messages;
                            renderMessages(messages);
                        }
                    }
                });
            }
        });

        socket.on('disconnect', function (reason) {
            if (reason !== 'io client disconnect') {
                showBanner('Reconnecting to live chat...', 'warn');
            }
        });

        socket.on('connect_error', function () {
            showBanner('Connection interrupted. Retrying...', 'warn');
        });

        socket.on('agent:presence', function (data) {
            if (data) {
                updatePresenceUI(data.isOnline, data.onlineAgentCount);
            }
        });

        socket.on('message:new', function (msg) {
            if (!msg) return;
            var exists = messages.some(function (m) { return m.id === msg.id; });
            if (!exists) {
                messages.push(msg);
                appendMessageElement(msg);
            }

            if (msg.senderType === 'AGENT') {
                if (dom.typingIndicator) dom.typingIndicator.classList.remove('active');

                if (!isOpen) {
                    unreadCount++;
                    updateBadge();
                } else {
                    markConversationRead();
                }
            }
        });

        socket.on('agent:typing', function (data) {
            if (!dom.typingIndicator) return;
            if (data && data.isTyping) {
                dom.typingIndicator.classList.add('active');
                scrollToBottom();
            } else {
                dom.typingIndicator.classList.remove('active');
            }
        });

        socket.on('conversation:status_changed', function (data) {
            if (data && data.status) {
                if (conversation) conversation.status = data.status;
                updateScreenState();
                if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
                    appendMessageElement({
                        id: 'status-' + Date.now(),
                        senderType: 'SYSTEM',
                        content: 'This conversation has ended.',
                        createdAt: new Date().toISOString()
                    });
                }
            }
        });
    }

    // Mark conversation read
    function markConversationRead() {
        if (!sessionToken) return;
        if (socket && socket.connected) {
            socket.emit('customer:mark_read', { sessionToken: sessionToken });
        } else {
            fetch(API_BASE + '/support/read', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: sessionToken })
            }).catch(function () {});
        }
    }

    // Send customer message
    async function sendMessage(text) {
        // Enforce pre-chat requirement: never allow sending messages before identification
        if (!isCustomerIdentified()) {
            updateScreenState();
            if (dom.preName) dom.preName.focus();
            return;
        }

        // Prevent sending if conversation has ended
        if (conversation && (conversation.status === 'RESOLVED' || conversation.status === 'CLOSED')) {
            updateScreenState();
            return;
        }

        var trimmed = (text || '').trim();
        if (!trimmed || isSending) return;

        isSending = true;
        dom.sendBtn.disabled = true;
        var originalBtnHtml = dom.sendBtn.innerHTML;
        dom.sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

        var senderName = (conversation && conversation.customerName) || (dom.preName && dom.preName.value.trim()) || 'Customer';

        // 1. Try Socket.IO emit with acknowledgement
        if (socket && socket.connected) {
            socket.emit('customer:message', {
                sessionToken: sessionToken,
                text: trimmed,
                senderName: senderName
            }, function (ack) {
                isSending = false;
                dom.sendBtn.disabled = false;
                dom.sendBtn.innerHTML = originalBtnHtml;

                if (ack && ack.success && ack.message) {
                    dom.textarea.value = '';
                    dom.textarea.style.height = 'auto';
                    var exists = messages.some(function (m) { return m.id === ack.message.id; });
                    if (!exists) {
                        messages.push(ack.message);
                        appendMessageElement(ack.message);
                    }
                    emitCustomerTyping(false);
                } else {
                    console.error('[Live Chat] Socket message error:', ack);
                    sendViaHttp(trimmed, senderName);
                }
            });
            return;
        }

        // 2. HTTP Fallback
        await sendViaHttp(trimmed, senderName);
    }

    async function sendViaHttp(trimmed, senderName) {
        try {
            var res = await fetch(API_BASE + '/support/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionToken: sessionToken,
                    text: trimmed,
                    senderName: senderName
                })
            });

            var result = await res.json();
            if (res.ok && result.success && result.data && result.data.message) {
                dom.textarea.value = '';
                dom.textarea.style.height = 'auto';
                var msg = result.data.message;
                var exists = messages.some(function (m) { return m.id === msg.id; });
                if (!exists) {
                    messages.push(msg);
                    appendMessageElement(msg);
                }
            } else {
                alert(result.message || 'Unable to send message. Please verify your connection.');
            }
        } catch (err) {
            console.error('[Live Chat] Send message error:', err);
            alert('Failed to send message. Please retry in a moment.');
        } finally {
            isSending = false;
            dom.sendBtn.disabled = false;
            dom.sendBtn.innerHTML = '<i class="bi bi-send-fill"></i>';
        }
    }

    // Customer Typing throttle
    function emitCustomerTyping(typing) {
        if (!socket || !socket.connected) return;
        if (isCustomerTyping === typing) return;
        isCustomerTyping = typing;
        socket.emit('customer:typing', {
            isTyping: typing,
            senderName: (conversation && conversation.customerName) || (dom.preName && dom.preName.value.trim()) || 'Customer'
        });
    }

    function handleTypingInput() {
        var len = dom.textarea.value.trim().length;
        dom.sendBtn.disabled = len === 0;

        dom.textarea.style.height = 'auto';
        dom.textarea.style.height = Math.min(dom.textarea.scrollHeight, 90) + 'px';

        emitCustomerTyping(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(function () {
            emitCustomerTyping(false);
        }, 2500);
    }

    // Attach Event Listeners
    function attachListeners() {
        // Toggle panel
        dom.launcher.addEventListener('click', togglePanel);
        dom.closeBtn.addEventListener('click', closePanel);

        // Escape key to close
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen) {
                closePanel();
            }
        });

        // Pre-chat form submission & live validation
        dom.prechatForm.addEventListener('submit', handlePrechatSubmit);
        dom.preName.addEventListener('input', function () {
            if (dom.preName.classList.contains('is-invalid')) {
                validatePrechatForm();
            }
        });
        dom.prePhone.addEventListener('input', function () {
            if (dom.prePhone.classList.contains('is-invalid')) {
                validatePrechatForm();
            }
        });

        // Composer form submission
        dom.chatForm.addEventListener('submit', function (e) {
            e.preventDefault();
            sendMessage(dom.textarea.value);
        });

        // Enter to send, Shift+Enter for newline
        dom.textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(dom.textarea.value);
            }
        });

        dom.textarea.addEventListener('input', handleTypingInput);
    }

    // Initialization on DOMContentLoaded
    function init() {
        buildWidgetDOM();
        attachListeners();
        initSession();

        // Show only the launcher initially. Open the chat window when clicked.
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
