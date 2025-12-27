import { formatText, replaceMacros } from './textFormatter.js';

export async function sendToLLM(text, activeChatChar, translations, currentLang, appendMessage, onComplete, controller) {
    let apiKey = localStorage.getItem('api-key');
    let apiUrl = localStorage.getItem('api-endpoint') || 'https://api.openai.com/v1';
    let model = localStorage.getItem('api-model') || 'gpt-3.5-turbo';
    let temp = parseFloat(localStorage.getItem('sc_api_temp')) || 0.7;
    let topP = parseFloat(localStorage.getItem('sc_api_topp')) || 0.9;
    let maxTokens = parseInt(localStorage.getItem('api-max-tokens')) || 300;

    if (!apiKey) {
        apiKey = prompt("Please enter your OpenAI API Key (stored locally):");
        if (apiKey) {
            localStorage.setItem('api-key', apiKey.trim());
            const keyInput = document.getElementById('api-key');
            if (keyInput) keyInput.value = apiKey.trim();
        } else {
            appendMessage({ role: 'char', text: "API Key is required. Please try again.", time: "System" }, "https://via.placeholder.com/100?text=Sys", "System", null);
            return;
        }
    }

    const container = document.getElementById('chat-messages');
    
    // --- Prompt Construction based on Preset ---
    const presets = JSON.parse(localStorage.getItem('sc_prompt_presets')) || [];
    const activePresetId = localStorage.getItem('sc_active_preset_id');
    const activePreset = presets.find(p => p.id === activePresetId) || presets[0]; // Fallback
    
    const messages = [];

    // Helper to get Chat History
    const getChatHistory = () => {
        const history = [];
        const msgNodes = container.querySelectorAll('.message-section');
        msgNodes.forEach(node => {
            const body = node.querySelector('.msg-body');
            if (!body || node.classList.contains('error')) return;
            if (body.querySelector('.typing-container')) return; // Skip incomplete messages

            if (node.classList.contains('user')) {
                history.push({ role: "user", content: body.textContent });
            } else if (node.classList.contains('char')) {
                history.push({ role: "assistant", content: body.textContent });
            }
        });
        return history;
    };

    // Helper to get User Persona
    const getUserPersona = () => {
        const savedPersona = localStorage.getItem('sc_active_persona');
        const persona = savedPersona ? JSON.parse(savedPersona) : { name: "User", prompt: "" };
        return `User Name: ${persona.name}\nUser Description: ${persona.prompt}`;
    };

    // Helper to get Char Card
    const getCharCard = () => {
        return `Character Name: ${activeChatChar.name}\nDescription: ${activeChatChar.description || activeChatChar.desc}`;
    };

    // Get Persona object for macros
    const savedPersonaStr = localStorage.getItem('sc_active_persona');
    const personaObj = savedPersonaStr ? JSON.parse(savedPersonaStr) : { name: "User", prompt: "" };

    // Iterate Blocks
    if (activePreset && activePreset.blocks) {
        activePreset.blocks.forEach(block => {
            if (!block.enabled) return;

            if (block.id === 'user_persona') {
                messages.push({ role: "system", content: getUserPersona() });
            } else if (block.id === 'char_card') {
                messages.push({ role: "system", content: getCharCard() });
            } else if (block.id === 'char_personality') {
                messages.push({ role: "system", content: `Personality: ${activeChatChar.personality}` });
            } else if (block.id === 'scenario') {
                messages.push({ role: "system", content: `Scenario: ${activeChatChar.scenario}` });
            } else if (block.id === 'chat_history') {
                messages.push(...getChatHistory());
            } else {
                // Custom Block
                let content = block.content;
                content = replaceMacros(content, activeChatChar, personaObj);
                messages.push({ role: block.role || "system", content: content });
            }
        });
    } else {
        // Fallback if no preset logic works
        messages.push({ role: "system", content: "You are a helpful assistant." });
        messages.push(...getChatHistory());
    }
    // -------------------------------------------

    const charName = activeChatChar.name;
    const charAvatar = activeChatChar.avatar || `https://via.placeholder.com/100?text=${charName[0]}`;
    
    const typingSection = document.createElement('div');
    typingSection.className = 'message-section char';
    typingSection.innerHTML = `
        <div class="msg-header">
            <img class="msg-avatar" src="${charAvatar}" alt="">
            <span class="msg-name">${charName} <sup class="item-version">${activeChatChar.version}</sup></span>
        </div>
        <div class="msg-body">
            <div class="typing-container">
                <svg class="typing-icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                <span class="typing-text">${translations[currentLang]['model_typing'] || 'Typing...'}</span>
            </div>
        </div>
    `;
    container.appendChild(typingSection);
    container.scrollTop = container.scrollHeight;

    const requestBody = {
        model: model,
        messages: messages,
        temperature: temp,
        top_p: topP,
        max_tokens: maxTokens
    };

    console.log("LLM Request:", requestBody);

    try {
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: controller ? controller.signal : undefined
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        console.log("LLM Response:", data);
        const content = data.choices[0].message.content;

        typingSection.querySelector('.msg-body').innerHTML = formatText(content);
        if (onComplete) onComplete(content);
    } catch (e) {
        if (e.name === 'AbortError') {
            typingSection.remove();
            return;
        }
        typingSection.querySelector('.msg-body').innerHTML = `<span style="color:red">Error: ${e.message}</span>`;
        typingSection.classList.add('error');
    }
}