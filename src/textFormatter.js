export function formatText(text) {
    if (!text) return "";
    let html = window.marked ? window.marked.parse(text) : text;
    
    // Если используется marked, он превращает *текст* в <em>текст</em>. Красим его.
    if (window.marked) {
        html = html.replace(/<em>/g, '<em style="color: #888;">');
    }

    // Регулярное выражение ищет HTML-теги (чтобы пропустить их) ИЛИ текст в кавычках (чтобы покрасить)
    // 1. <[^>]+> : HTML теги
    // 2. "..." : Двойные кавычки
    // 3. “...” : Умные кавычки
    // 4. «...» : Кавычки-елочки
    // 5. *...* : Звездочки (для случая без marked)
    const regex = /(<[^>]+>)|("[\s\S]*?"|“[\s\S]*?”|«[\s\S]*?»)|(\*[\s\S]*?\*)/g;
    
    return html.replace(regex, (match, tag, quote, asterisk) => {
        if (tag) return tag; // Если это тег, возвращаем как есть
        if (quote) return `<span style="color: var(--vk-blue);">${quote}</span>`;
        if (asterisk) return `<span style="color: #888;">${asterisk}</span>`;
        return match;
    });
}

export function replaceMacros(text, char, persona) {
    if (!text) return "";
    
    const charName = char ? char.name : "Character";
    const charDesc = char ? (char.description || char.desc || "") : "";
    const charScenario = char ? (char.scenario || "") : "";
    const charPersonality = char ? (char.personality || "") : "";
    
    const userName = persona ? persona.name : "User";
    const userPersona = persona ? (persona.prompt || "") : "";

    return text.replace(/{{char}}/gi, charName)
               .replace(/{{description}}/gi, charDesc)
               .replace(/{{scenario}}/gi, charScenario)
               .replace(/{{personality}}/gi, charPersonality)
               .replace(/{{user}}/gi, userName)
               .replace(/{{persona}}/gi, userPersona);
}