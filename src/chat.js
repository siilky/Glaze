import { translations } from './i18n.js';
import { currentLang } from './APPSettings.js';
import { sendToLLM } from './llmApi.js';
import { getCharacterByName } from './characterList.js';
import { attachLongPress, openBottomSheet, closeBottomSheet } from './ui.js';
import { formatText, replaceMacros } from './textFormatter.js';

let activeChatChar = null;
const generatingStates = {}; // { charName: genId }
let genIdCounter = 0;

export function initChat() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    document.getElementById('btn-send').addEventListener('click', sendMessage);

    document.getElementById('btn-magic').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('magic-menu').classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        const menu = document.getElementById('magic-menu');
        if (menu) menu.classList.add('hidden');
    });

    // Magic Menu Regenerate
    const btnMagicRegen = document.getElementById('btn-regenerate');
    if (btnMagicRegen) btnMagicRegen.addEventListener('click', (e) => {
        e.stopPropagation();
        const container = document.getElementById('chat-messages');
        const lastMsg = container.lastElementChild;
        if (lastMsg) regenerateMessage(lastMsg, true); // true = from magic menu
        document.getElementById('magic-menu').classList.add('hidden');
    });

    // Init Message Actions Sheet Listeners
    const btnRegen = document.getElementById('btn-msg-regenerate');
    const btnDel = document.getElementById('btn-msg-delete');
    
    if (btnRegen) btnRegen.addEventListener('click', () => {
        if (activeMessageElement) regenerateMessage(activeMessageElement);
        closeBottomSheet('msg-actions-sheet-overlay');
    });

    if (btnDel) btnDel.addEventListener('click', () => {
        if (activeMessageElement) deleteMessage(activeMessageElement);
        closeBottomSheet('msg-actions-sheet-overlay');
    });
}

function updateSendButton(isGenerating) {
    const btn = document.getElementById('btn-send');
    if (!btn) return;
    if (isGenerating) {
        // Stop Icon
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>';
    } else {
        // Send Icon
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    }
}

function sendMessage() {
    if (activeChatChar && generatingStates[activeChatChar.name]) {
        // Stop Generation
        const state = generatingStates[activeChatChar.name];
        if (state.controller) state.controller.abort();
        delete generatingStates[activeChatChar.name];
        updateSendButton(false);
        
        // Remove placeholder if exists (for re-entered chat)
        const placeholder = document.querySelector('.typing-indicator-placeholder');
        if (placeholder) placeholder.remove();
        return;
    }

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text) {
        const now = new Date();
        const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        
        // Get current persona info
        const savedPersona = localStorage.getItem('sc_active_persona');
        const persona = savedPersona ? JSON.parse(savedPersona) : { name: "User", avatar: null };
        
        // Apply macros to user text
        const processedText = replaceMacros(text, activeChatChar, persona);
        
        const msgData = { role: 'user', text: processedText, time: time, persona: { name: persona.name, avatar: persona.avatar } };
        appendMessage(msgData, null, persona.name, null);
        
        input.value = '';
        input.style.height = 'auto'; 
        
        if (activeChatChar) {
            startGeneration(activeChatChar, processedText);
        }
    }
}

function startGeneration(char, text) {
    const genId = ++genIdCounter;
    const controller = new AbortController();
    generatingStates[char.name] = { genId, controller };

    if (activeChatChar && activeChatChar.name === char.name) {
        updateSendButton(true);
    }

    sendToLLM(text, char, translations, currentLang, appendMessage, (response) => {
        const currentState = generatingStates[char.name];
        if (!currentState || currentState.genId !== genId) return; // Stopped or superseded
        
        delete generatingStates[char.name];

        const savedChats = localStorage.getItem('sc_chats');
        const chats = savedChats ? JSON.parse(savedChats) : {};
        if (!chats[char.name]) chats[char.name] = [];
        
        const now = new Date();
        const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        
        const msg = {
            role: 'char',
            text: response,
            time: time,
            genTime: '0s',
            tokens: response.length
        };
        chats[char.name].push(msg);
        localStorage.setItem('sc_chats', JSON.stringify(chats));

        if (activeChatChar && activeChatChar.name === char.name) {
            // Remove placeholder if exists
            const placeholder = document.querySelector('.typing-indicator-placeholder');
            if (placeholder) placeholder.remove();

            appendMessage(msg, char.avatar, char.name, char.version);
            updateSendButton(false);
        } else {
            // Mark unread
            const unread = JSON.parse(localStorage.getItem('sc_unread') || '{}');
            unread[char.name] = true;
            localStorage.setItem('sc_unread', JSON.stringify(unread));

            // If we are in the list view or another chat, update the list
            renderDialogs();
        }
    }, controller);
}

export function openChat(char, onBack) {
    activeChatChar = char;
    const chatView = document.getElementById('view-chat');
    const currentView = document.querySelector('.view.active-view');
    const tabbar = document.querySelector('.tabbar');
    const headerDefault = document.getElementById('header-content-default');
    const headerChatInfo = document.getElementById('header-chat-info');
    const headerActions = document.getElementById('header-actions');
    const backBtn = document.getElementById('header-back');
    const headerLogo = document.getElementById('header-logo');

    chatView.classList.remove('anim-fade-out', 'anim-fade-in');

    headerDefault.style.display = 'none';
    headerChatInfo.style.display = 'flex';
    headerActions.style.display = 'flex';
    backBtn.style.display = 'flex';
    tabbar.style.display = 'none';
    if(headerLogo) headerLogo.style.display = 'none';

    updateSendButton(!!generatingStates[char.name]);

    // Clear unread
    const unread = JSON.parse(localStorage.getItem('sc_unread') || '{}');
    if (unread[char.name]) {
        delete unread[char.name];
        localStorage.setItem('sc_unread', JSON.stringify(unread));
    }

    document.getElementById('chat-header-name').innerHTML = `${char.name} <sup class="item-version" style="color: var(--vk-blue);">${char.version || ''}</sup>`;
    
    const headerAvatarImg = document.getElementById('chat-header-avatar');
    const headerAvatarParent = headerAvatarImg.parentElement;
    let headerPlaceholder = document.getElementById('chat-header-avatar-placeholder');

    if (char.avatar) {
        headerAvatarImg.style.display = 'block';
        headerAvatarImg.src = char.avatar;
        if (headerPlaceholder) headerPlaceholder.style.display = 'none';
    } else {
        headerAvatarImg.style.display = 'none';
        if (!headerPlaceholder) {
            headerPlaceholder = document.createElement('div');
            headerPlaceholder.id = 'chat-header-avatar-placeholder';
            headerPlaceholder.className = 'msg-avatar';
            // Copy basic styles from img or set defaults
            headerPlaceholder.style.cssText = "width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2em; margin-right: 10px;";
            headerAvatarParent.insertBefore(headerPlaceholder, headerAvatarImg);
        }
        headerPlaceholder.style.display = 'flex';
        headerPlaceholder.style.backgroundColor = char.color || '#ccc';
        headerPlaceholder.textContent = (char.name[0] || "?").toUpperCase();
    }

    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';

    const dateDiv = document.createElement('div');
    dateDiv.className = 'chat-date-separator';
    dateDiv.textContent = translations[currentLang]['dialog_started'];
    messagesContainer.appendChild(dateDiv);

    // Load messages
    const savedChats = localStorage.getItem('sc_chats');
    let chats = savedChats ? JSON.parse(savedChats) : {};
    let msgs = chats[char.name] || [];

    // First Message Logic
    if (msgs.length === 0 && char.first_mes) {
        const now = new Date();
        const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        const firstMsg = {
            role: 'char',
            text: char.first_mes,
            time: time,
            genTime: '0s',
            tokens: 0
        };
        msgs.push(firstMsg);
        // Save immediately
        if (!chats[char.name]) chats[char.name] = [];
        chats[char.name].push(firstMsg);
        localStorage.setItem('sc_chats', JSON.stringify(chats));
    }

    msgs.forEach(m => {
        let avatar = null;
        let name = 'User';
        if (m.role === 'char') {
            avatar = char.avatar; // Will be handled by appendMessage fallback
            name = char.name;
        }
        appendMessage(m, avatar, name, m.role === 'char' ? char.version : null, false);
    });

    // Check generation state to restore typing indicator (After messages are loaded)
    if (generatingStates[char.name]) {
        const charName = char.name;
        
        let avatarHtml = '';
        if (char.avatar) {
            avatarHtml = `<img class="msg-avatar" src="${char.avatar}" alt="">`;
        } else {
            avatarHtml = `<div class="msg-avatar" style="background-color: ${char.color || '#ccc'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2em;">${(charName[0] || "?").toUpperCase()}</div>`;
        }

        const typingSection = document.createElement('div');
        typingSection.className = 'message-section char typing-indicator-placeholder';
        typingSection.innerHTML = `
            <div class="msg-header">
                ${avatarHtml}
                <span class="msg-name">${charName} <sup class="item-version">${char.version || ''}</sup></span>
            </div>
            <div class="msg-body">
                <div class="typing-container">
                    <svg class="typing-icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span class="typing-text">${translations[currentLang]['model_typing'] || 'Typing...'}</span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingSection);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (currentView) currentView.classList.remove('active-view');
    chatView.classList.add('active-view', 'anim-fade-in');
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    backBtn.onclick = () => {
        activeChatChar = null;
        chatView.classList.remove('anim-fade-in');
        chatView.classList.add('anim-fade-out');
        
        if (onBack) onBack();

        const onAnimationEnd = () => {
            chatView.classList.remove('active-view', 'anim-fade-out');
        };
        chatView.addEventListener('animationend', onAnimationEnd, { once: true });

        headerDefault.style.display = 'flex';
        headerChatInfo.style.display = 'none';
        headerActions.style.display = 'none';
        backBtn.style.display = 'none';
        tabbar.style.display = 'flex';
        if(headerLogo) headerLogo.style.display = 'flex';
    };
}

export function createNewSession() {
    if (activeChatChar) {
        const savedChats = localStorage.getItem('sc_chats');
        let chats = savedChats ? JSON.parse(savedChats) : {};
        chats[activeChatChar.name] = []; // Clear messages
        localStorage.setItem('sc_chats', JSON.stringify(chats));
        
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        const dateDiv = document.createElement('div');
        dateDiv.className = 'chat-date-separator';
        dateDiv.textContent = translations[currentLang]['dialog_started'];
        messagesContainer.appendChild(dateDiv);

        if (activeChatChar.first_mes) {
            const now = new Date();
            const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
            const firstMsg = {
                role: 'char',
                text: activeChatChar.first_mes,
                time: time,
                genTime: '0s',
                tokens: 0
            };
            
            chats[activeChatChar.name].push(firstMsg);
            localStorage.setItem('sc_chats', JSON.stringify(chats));
            
            const charAvatar = activeChatChar.avatar || `https://via.placeholder.com/100?text=${activeChatChar.name[0]}`;
            appendMessage(firstMsg, charAvatar, activeChatChar.name, activeChatChar.version, false);
        }
    }
}

export function deleteSession() {
    if (activeChatChar) {
        const savedChats = localStorage.getItem('sc_chats');
        let chats = savedChats ? JSON.parse(savedChats) : {};
        delete chats[activeChatChar.name];
        localStorage.setItem('sc_chats', JSON.stringify(chats));
        
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
    }
}

let activeMessageElement = null;

function appendMessage(msg, forceAvatarUrl, defaultName, version, save = true) {
    const container = document.getElementById('chat-messages');
    const section = document.createElement('div');
    section.className = `message-section ${msg.role}`;
    
    // Determine Name and Avatar
    let displayName = defaultName;
    let displayAvatar = forceAvatarUrl;

    if (msg.role === 'user') {
        if (msg.persona) {
            displayName = msg.persona.name || "User";
            displayAvatar = msg.persona.avatar;
        } else {
            // Fallback for old messages
            displayName = "User";
        }
    }

    let metaHtml = '';
    if (msg.role === 'char') {
        metaHtml = `<span>Gen: ${msg.genTime || '0s'}</span><span>Tok: ${msg.tokens || 0}</span><span>${msg.time}</span>`;
    } else {
        metaHtml = `<span>${msg.time}</span>`;
    }

    const nameHtml = version ? `${displayName} <sup class="item-version">${version}</sup>` : displayName;

    // Avatar HTML generation
    let avatarHtml = '';
    if (displayAvatar) {
        avatarHtml = `<img class="msg-avatar" src="${displayAvatar}" alt="">`;
    } else {
        // Letter avatar
        const letter = (displayName && displayName[0]) ? displayName[0].toUpperCase() : "?";
        const color = msg.role === 'char' ? (activeChatChar?.color || '#ccc') : 'var(--vk-blue)';
        avatarHtml = `<div class="msg-avatar" style="background-color: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2em;">${letter}</div>`;
    }

    section.innerHTML = `
        <div class="msg-header">
            ${avatarHtml}
            <span class="msg-name">${nameHtml}</span>
        </div>
        <div class="msg-body">${formatText(msg.text)}</div>
        <div class="msg-footer">${metaHtml}</div>
    `;
    
    container.appendChild(section);
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });

    // Attach Long Press for Actions
    const checkLongPress = attachLongPress(section, () => {
        activeMessageElement = section;
        openBottomSheet('msg-actions-sheet-overlay');
    });

    // Swipe Left Logic (Regenerate) - Only for Char
    if (msg.role === 'char') {
        let startX = 0;
        section.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            section.style.transition = 'none';
        }, {passive: true});
        
        section.addEventListener('touchmove', e => {
            const delta = e.touches[0].clientX - startX;
            if (delta < 0) section.style.transform = `translateX(${delta}px)`;
        }, {passive: true});
        
        section.addEventListener('touchend', e => {
            const delta = e.changedTouches[0].clientX - startX;
            section.style.transition = 'transform 0.3s ease';
            if (delta < -100) {
                section.style.transform = `translateX(-100%)`;
                setTimeout(() => regenerateMessage(section), 300);
            } else {
                section.style.transform = 'translateX(0)';
            }
        });
    }

    if (save && activeChatChar) {
        const savedChats = localStorage.getItem('sc_chats');
        const chats = savedChats ? JSON.parse(savedChats) : {};
        if (!chats[activeChatChar.name]) chats[activeChatChar.name] = [];
        chats[activeChatChar.name].push(msg);
        localStorage.setItem('sc_chats', JSON.stringify(chats));
    }
}

function deleteMessage(element) {
    const container = document.getElementById('chat-messages');
    const allMsgs = Array.from(container.querySelectorAll('.message-section'));
    const index = allMsgs.indexOf(element);
    
    if (index === -1) return;

    // Remove from DOM
    element.remove();

    // Update Storage
    if (activeChatChar) {
        const savedChats = localStorage.getItem('sc_chats');
        let chats = savedChats ? JSON.parse(savedChats) : {};
        if (chats[activeChatChar.name]) {
            chats[activeChatChar.name].splice(index, 1);
            localStorage.setItem('sc_chats', JSON.stringify(chats));
        }
    }
}

function regenerateMessage(element, isMagic = false) {
    const container = document.getElementById('chat-messages');
    const allMsgs = Array.from(container.querySelectorAll('.message-section'));
    const index = allMsgs.indexOf(element);
    
    if (index === -1) return;

    const isUser = element.classList.contains('user');

    // If Magic Menu and last message is User -> Don't delete, just generate
    if (isMagic && isUser) {
        if (activeChatChar) {
            // We pass null text to imply "continue/regenerate" based on history, 
            // or we could pass the user text if the API requires it. 
            // Assuming sendToLLM(null...) handles context building from history.
            startGeneration(activeChatChar, null);
        }
        return;
    }

    // If Magic Menu and last message is Char -> Swipe animation then delete & regen
    if (isMagic && !isUser) {
        element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        element.style.transform = 'translateX(-100%)';
        element.style.opacity = '0';
        
        setTimeout(() => {
            performDeleteAndRegen();
        }, 300);
        return;
    }

    // Default behavior (context menu) or after animation
    performDeleteAndRegen();

    function performDeleteAndRegen() {
        // Remove this message and all subsequent messages from DOM
        for (let i = allMsgs.length - 1; i >= index; i--) {
            allMsgs[i].remove();
        }

        // Update Storage (Remove this and subsequent)
        if (activeChatChar) {
            const savedChats = localStorage.getItem('sc_chats');
            let chats = savedChats ? JSON.parse(savedChats) : {};
            if (chats[activeChatChar.name]) {
                chats[activeChatChar.name].splice(index);
                localStorage.setItem('sc_chats', JSON.stringify(chats));
            }
            
            // Trigger Generation
            startGeneration(activeChatChar, null);
        }
    }
}

let _onChatOpen, _onChatAction, _lastCategory;
export function renderDialogs(category = 'all', onChatOpen, onChatAction) {
    if (onChatOpen) _onChatOpen = onChatOpen;
    if (onChatAction) _onChatAction = onChatAction;
    if (category && category !== 'all') _lastCategory = category;

    const list = document.getElementById('dialogs-list');
    if (!list) return;
    
    list.innerHTML = '';

    const savedChats = localStorage.getItem('sc_chats');
    const chats = savedChats ? JSON.parse(savedChats) : {};
    const unread = JSON.parse(localStorage.getItem('sc_unread') || '{}');

    const cat = category === 'all' && _lastCategory ? 'all' : (category || _lastCategory || 'all');

    const chatList = Object.keys(chats).map(charName => {
        const msgs = chats[charName];
        const lastMsg = msgs[msgs.length - 1];
        const char = getCharacterByName(charName);
        return {
            name: charName,
            msg: lastMsg ? lastMsg.text : (char?.first_mes || ""),
            time: lastMsg ? lastMsg.time : "",
            avatar: char ? char.avatar : null,
            color: char ? char.color : "#ccc",
            category: char ? char.category : "all",
            charObj: char
        };
    }).filter(item => item.charObj);

    chatList.forEach(chat => {
        if (cat !== 'all' && chat.category !== cat) return;

        const el = document.createElement('div');
        el.className = 'list-item';
        if (unread[chat.name]) {
            el.classList.add('unread');
        }
        
        let avatarHtml;
        if (chat.avatar) {
            avatarHtml = `<div class="avatar"><img src="${chat.avatar}" alt="${chat.name}"></div>`;
        } else {
            avatarHtml = `<div class="avatar" style="background-color: ${chat.color || '#66ccff'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5em;">${chat.name[0].toUpperCase()}</div>`;
        }

        let subtitleHtml = chat.msg;
        if (generatingStates[chat.name]) {
            subtitleHtml = `<div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
        }

        el.innerHTML = `
            ${avatarHtml}
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${chat.name}</span>
                    <span class="item-meta">${chat.time}</span>
                </div>
                <div class="item-subtitle">${subtitleHtml}</div>
            </div>
        `;
        
        const checkLongPress = attachLongPress(el, () => {
            if (_onChatAction) _onChatAction(chat.charObj);
        });

        el.addEventListener('click', (e) => {
            if (checkLongPress()) return;
            if (_onChatOpen) _onChatOpen(chat.charObj);
        });

        list.appendChild(el);
    });
}