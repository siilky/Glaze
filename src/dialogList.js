import { getCharacterByName } from './characterList.js';
import { attachLongPress } from './ui.js';
import { formatText } from './textFormatter.js';
import { isCharacterGenerating } from './chat.js';

let _onChatOpen, _onChatAction, _lastCategory;

window.addEventListener('character-updated', () => {
    renderDialogs();
});

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

    const chatList = [];

    Object.keys(chats).forEach(charName => {
        const charData = chats[charName];
        const char = getCharacterByName(charName);
        if (!char) return;

        if (Array.isArray(charData)) {
            // Legacy format (single session)
            const msgs = charData;
            const lastMsg = msgs[msgs.length - 1];
            chatList.push({
                name: charName,
                sessionId: 1,
                msg: lastMsg ? lastMsg.text : (char.first_mes || ""),
                time: lastMsg ? lastMsg.time : "",
                timestamp: lastMsg ? (lastMsg.timestamp || 0) : 0,
                avatar: char.avatar,
                color: char.color,
                category: char.category,
                charObj: { ...char, sessionId: 1 },
                isCurrent: true
            });
        } else if (charData && charData.sessions) {
            // Multiple sessions
            Object.keys(charData.sessions).forEach(sid => {
                const sessionId = parseInt(sid);
                const msgs = charData.sessions[sid];
                const lastMsg = msgs[msgs.length - 1];
                chatList.push({
                    name: charName,
                    sessionId: sessionId,
                    msg: lastMsg ? lastMsg.text : (char.first_mes || ""),
                    time: lastMsg ? lastMsg.time : "",
                    timestamp: lastMsg ? (lastMsg.timestamp || 0) : 0,
                    avatar: char.avatar,
                    color: char.color,
                    category: char.category,
                    charObj: { ...char, sessionId: sessionId },
                    isCurrent: sessionId === charData.currentId
                });
            });
        }
    });

    // Sort by timestamp descending
    chatList.sort((a, b) => {
        return b.timestamp - a.timestamp;
    });

    chatList.forEach(chat => {
        if (cat !== 'all' && chat.category !== cat) return;

        const el = document.createElement('div');
        el.className = 'list-item';
        // Mark unread only if it's the current session (where new messages arrive)
        if (unread[chat.name] && chat.isCurrent) {
            el.classList.add('unread');
        }
        
        let avatarHtml;
        if (chat.avatar) {
            avatarHtml = `<div class="avatar"><img src="${chat.avatar}" alt="${chat.name}"></div>`;
        } else {
            avatarHtml = `<div class="avatar" style="background-color: ${chat.color || '#66ccff'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5em;">${chat.name[0].toUpperCase()}</div>`;
        }

        let subtitleHtml = "";
        if (isCharacterGenerating(chat.name) && chat.isCurrent) {
            subtitleHtml = `<div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
        } else {
            let rawText = chat.msg || "";
            // Apply markdown and strip paragraph tags if added by formatter
            let formatted = formatText(rawText);
            formatted = formatted.replace(/<\/?p>/g, '');

            const maxLength = 100;
            if (formatted.length > maxLength) {
                formatted = formatted.substring(0, maxLength) + '...';
            }
            subtitleHtml = formatted;
        }

        const sessionLabel = `<div style="color: var(--text-gray); font-size: 0.8em; margin-bottom: 2px;">Session #${chat.sessionId}</div>`;

        el.innerHTML = `
            ${avatarHtml}
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${chat.name}</span>
                    <span class="item-meta">${chat.time}</span>
                </div>
                <div class="item-subtitle">
                    ${sessionLabel}
                    ${subtitleHtml}
                </div>
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