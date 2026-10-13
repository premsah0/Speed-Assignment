/**
 * Speed Assignment - AI Chatbot Integration
 * Connects the existing frontend chatbot UI to POST /api/chat backend (Google Gemini AI)
 */

(function () {
    'use strict';

    let chatHistory = [];
    let isSending = false;

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatAiReply(text) {
        if (!text) return '';
        let formatted = escapeHtml(text);
        // Basic markdown formatting for AI responses
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n\n/g, '<br><br>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    function initChatbot() {
        const chatPanel = document.getElementById('aiChatPanel');
        const chatBody = document.getElementById('aiChatBody');
        const chatInput = document.getElementById('aiChatInput');
        if (!chatPanel || !chatBody || !chatInput) return;

        // Locate send button inside footer
        const sendBtn = chatPanel.querySelector('.ai-chat-send') || chatPanel.querySelector('button[aria-label="Send Message"]');

        const defaultApiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0' || window.location.protocol === 'file:')
            ? 'http://localhost:5001/api'
            : '/api';
        const API_BASE = (window.ASSIGNMENTGHAR_API_URL || defaultApiBase).replace(/\/+$/, '');

        // Load welcome message and status from ChatbotConfig model via GET /api/chat/config
        fetch(`${API_BASE}/chat/config`)
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data) {
                    if (result.data.isEnabled === false) {
                        chatBody.innerHTML = `<div class="ai-chat-msg-bot">Our AI Assistant is currently offline. Please reach out via WhatsApp or our Contact page!</div>`;
                    } else if (result.data.welcomeMessage) {
                        chatBody.innerHTML = `<div class="ai-chat-msg-bot">${escapeHtml(result.data.welcomeMessage)}</div>`;
                    }
                }
            })
            .catch(err => {
                console.warn("Using default chatbot greeting.", err);
            });

        async function sendMessage() {
            if (isSending) return;

            const messageText = chatInput.value.trim();
            if (!messageText) return;

            isSending = true;

            // Disable input and send button during transmission
            chatInput.disabled = true;
            if (sendBtn) sendBtn.disabled = true;

            // 1. Append User Message
            const userMsgDiv = document.createElement('div');
            userMsgDiv.className = 'ai-chat-msg-user';
            userMsgDiv.textContent = messageText;
            chatBody.appendChild(userMsgDiv);

            chatInput.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;

            // 2. Add Typing / Loading Indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'ai-chat-msg-bot ai-chat-loading-indicator';
            loadingDiv.innerHTML = `<span class="spinner-grow spinner-grow-sm text-success me-1" role="status" aria-hidden="true" style="width: 0.75rem; height: 0.75rem;"></span><span class="small text-muted">AI Assistant is thinking...</span>`;
            chatBody.appendChild(loadingDiv);
            chatBody.scrollTop = chatBody.scrollHeight;

            // 3. Post to Backend API
            try {
                const response = await fetch(`${API_BASE}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: messageText,
                        history: chatHistory.slice(-6) // Send recent history context
                    })
                });

                // Remove loading indicator
                if (loadingDiv.parentNode) {
                    loadingDiv.parentNode.removeChild(loadingDiv);
                }

                const result = await response.json();

                if (response.ok && result.success && result.data && result.data.reply) {
                    const aiReplyText = result.data.reply;

                    // Update history
                    chatHistory.push({ role: 'user', content: messageText });
                    chatHistory.push({ role: 'model', content: aiReplyText });

                    // Append AI Reply Bubble
                    const botMsgDiv = document.createElement('div');
                    botMsgDiv.className = 'ai-chat-msg-bot';
                    botMsgDiv.innerHTML = formatAiReply(aiReplyText);
                    chatBody.appendChild(botMsgDiv);
                } else {
                    const errorMsgDiv = document.createElement('div');
                    errorMsgDiv.className = 'ai-chat-msg-bot text-danger';
                    errorMsgDiv.textContent = (result && result.message) ? result.message : "Unable to get response from AI. Please try again or reach out on WhatsApp.";
                    chatBody.appendChild(errorMsgDiv);
                }
            } catch (err) {
                console.error("Chatbot send message error:", err);
                if (loadingDiv.parentNode) {
                    loadingDiv.parentNode.removeChild(loadingDiv);
                }
                const errorMsgDiv = document.createElement('div');
                errorMsgDiv.className = 'ai-chat-msg-bot text-muted';
                errorMsgDiv.textContent = "Network error connecting to AI Assistant. Please submit your requirements on our Contact page or WhatsApp.";
                chatBody.appendChild(errorMsgDiv);
            } finally {
                isSending = false;
                chatInput.disabled = false;
                if (sendBtn) sendBtn.disabled = false;
                chatInput.focus();
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }

        // Clean up any inline HTML event attributes & properties
        chatInput.onkeypress = null;
        chatInput.onkeydown = null;
        chatInput.removeAttribute('onkeypress');
        chatInput.removeAttribute('onkeydown');

        if (sendBtn) {
            sendBtn.onclick = null;
            sendBtn.removeAttribute('onclick');
            sendBtn.addEventListener('click', function (e) {
                e.preventDefault();
                sendMessage();
            });
        }

        // Attach Keydown event (Enter key)
        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
