let GPTTokenizer = null;
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

if (!isIOS) {
    // Dynamic import to avoid stack overflow on iOS during worker initialization
    import('../tokenizers/gp-tokenizer-9KQssiTx.js').then(module => {
        GPTTokenizer = module.T;
    }).catch(err => {
        console.error("Worker: Failed to load tokenizer:", err);
    });
}

function estimateTokens(text) {
    if (!text) return 0;
    if (GPTTokenizer && typeof GPTTokenizer.countTokens === 'function') {
        try {
            return GPTTokenizer.countTokens(text);
        } catch (e) {
            // Fallback for any errors during full tokenization
        }
    }
    // Lightweight heuristic fallback
    return Math.ceil(text.length / 3.35);
}

function escapeRegex(string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function sanitizeRegexFlags(flags) {
    const valid = new Set(['g', 'i', 'm', 's', 'u', 'y']);
    let out = '';
    for (const ch of (flags || '')) {
        if (valid.has(ch) && !out.includes(ch)) out += ch;
    }
    if (!out.includes('g')) out += 'g';
    return out;
}

function tryCreateRegex(pattern, flags = 'g') {
    if (pattern === undefined || pattern === null) return null;
    const strPattern = `${pattern}`;
    if (!strPattern) return null;
    try {
        return new RegExp(strPattern, sanitizeRegexFlags(flags));
    } catch (e) {
        return null;
    }
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

function rollDice(dice) {
    const match = dice.match(/(\d+)d(\d+)/i);
    if (!match) return dice;
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total.toString();
}

function replaceMacros(text, char, persona, sessionVars, charId, sessionId, notifyObj) {
    if (!text) return "";

    // --- Comments ---
    // Multi-line scoped: {{ // }} ... {{ /// }}
    let result = text.replace(/\{\{\s*\/\/\s*\}\}[\s\S]*?\{\{\s*\/\/\/\s*\}\}/g, '');
    // Single-line: {{// comment}}
    result = result.replace(/\{\{\/\/[^}]*\}\}/g, '');

    const charName = char ? char.name : "Character";
    const charDesc = char ? (char.description || char.desc || "") : "";
    const charScenario = char ? (char.scenario || "") : "";
    const charPersonality = char ? (char.personality || "") : "";
    const charMesExample = char ? (char.mes_example || "") : "";

    const userName = persona ? persona.name : "User";
    const userPersona = persona ? (persona.prompt || "") : "";

    result = result.replace(/{{char}}/gi, charName)
        .replace(/{{description}}/gi, charDesc)
        .replace(/{{scenario}}/gi, charScenario)
        .replace(/{{personality}}/gi, charPersonality)
        .replace(/{{mesExamples}}/gi, charMesExample)
        .replace(/{{user}}/gi, userName)
        .replace(/{{persona}}/gi, userPersona);

    if (result.includes("{{trim}}")) {
        result = result.replace(/{{trim}}/gi, "").trim();
    }

    result = result.replace(/{{setvar::([\s\S]*?)::([\s\S]*?)}}/gi, (match, name, value) => {
        sessionVars[name] = value;
        notifyObj.varsChanged = true;
        return "";
    });

    result = result.replace(/{{getvar::([\s\S]*?)}}/gi, (match, name) => {
        return sessionVars[name] !== undefined ? sessionVars[name] : "";
    });

    result = result.replace(/{{random::(.*?)}}/gi, (match, optionsStr) => {
        const options = optionsStr.split("::");
        return options[Math.floor(Math.random() * options.length)];
    });

    let pickCount = 0;
    result = result.replace(/{{pick::(.*?)}}/gi, (match, optionsStr) => {
        const options = optionsStr.split("::");
        const version = sessionVars.__pick_version || 0;
        const seed = `${charId}_${sessionId}_pick_${pickCount++}_v${version}`;
        const hash = simpleHash(seed);
        return options[hash % options.length];
    });

    result = result.replace(/{{roll::(.*?)}}/gi, (match, dice) => {
        return rollDice(dice);
    });

    // --- Escaping: \{\{ → {{ and \}\} → }} ---
    result = result.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

    return result;
}

function applyRegexes(text, placementFilter, ephemeralityFilter, allScripts, options = {}) {
    if (!text) return "";
    let processedText = text;
    const { char, persona, sessionVars, charId, sessionId, notifyObj } = options;

    for (const script of allScripts) {
        if (script.disabled) continue;
        if (script.placement && !script.placement.includes(placementFilter)) continue;
        if (script.ephemerality && !script.ephemerality.includes(ephemeralityFilter)) continue;

        try {
            if (script.trimOut) {
                const trimTokens = script.trimOut.split('\n').filter(t => t.trim());
                for (const token of trimTokens) {
                    const trimRegex = tryCreateRegex(token, 'g');
                    if (trimRegex) {
                        processedText = processedText.replace(trimRegex, '');
                    } else {
                        processedText = processedText.split(token).join('');
                    }
                }
            }

            if (script.regex) {
                let pattern = script.regex;
                let replacement = script.replacement || '';
                let flags = 'g';

                // Handle Macros
                if (script.macroRules && script.macroRules !== '0') {
                    if (script.macroRules === '1') { // Raw
                        pattern = replaceMacros(pattern, char, persona, sessionVars, charId, sessionId, notifyObj);
                        replacement = replaceMacros(replacement, char, persona, sessionVars, charId, sessionId, notifyObj);
                    } else if (script.macroRules === '2') { // Escaped
                        pattern = pattern.replace(/{{user}}/gi, persona ? escapeRegex(persona.name) : 'User')
                            .replace(/{{char}}/gi, char ? escapeRegex(char.name) : 'Character');
                        pattern = replaceMacros(pattern, char, persona, sessionVars, charId, sessionId, notifyObj);
                        replacement = replaceMacros(replacement, char, persona, sessionVars, charId, sessionId, notifyObj);
                    }
                }

                // Support /pattern/flags format
                if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
                    const lastSlash = pattern.lastIndexOf('/');
                    const extractedFlags = pattern.substring(lastSlash + 1);
                    pattern = pattern.substring(1, lastSlash);
                    flags = extractedFlags.includes('g') ? extractedFlags : extractedFlags + 'g';
                }

                const regex = tryCreateRegex(pattern, flags);
                if (regex) {
                    processedText = processedText.replace(regex, replacement);
                } else if (pattern) {
                    // Safe literal fallback for invalid/pathological regex on iOS
                    processedText = processedText.split(pattern).join(replacement);
                }
            }
        } catch (e) {
            // Ignore regex errors in worker
        }
    }

    return processedText;
}

function scanLorebooksPure(history, char, textToScan, chatId, lorebooks, globalSettings, activations) {
    const charId = char?.id;

    const activeLorebooks = lorebooks.filter(lb => {
        if (lb.enabled) return true;
        if (charId && activations?.character?.[charId]?.includes(lb.id)) return true;
        if (chatId && activations?.chat?.[chatId]?.includes(lb.id)) return true;
        return false;
    });

    if (activeLorebooks.length === 0) return [];

    let allRelevantEntries = [];
    let candidates = [];

    activeLorebooks.forEach(lb => {
        lb.entries.forEach(entry => {
            if (entry.enabled !== false) {
                if (char && entry.characterFilter) {
                    const { isExclude, names } = entry.characterFilter;
                    if (names && names.length > 0) {
                        const charName = (char.name || "").toLowerCase();
                        const isInCategory = names.some(n => charName.includes(n.toLowerCase()));
                        if (isExclude && isInCategory) return;
                        if (!isExclude && !isInCategory) return;
                    }
                }
                candidates.push({ ...entry, lorebookName: lb.name, lorebookId: lb.id });
            }
        });
    });

    candidates.filter(e => e.constant).forEach(entry => {
        if (!allRelevantEntries.some(e => e.id === entry.id)) {
            allRelevantEntries.push(entry);
        }
    });

    let changed = true;
    let iteration = 0;
    const maxIterations = (globalSettings.recursiveScan === false) ? 1 : 5;

    while (changed && iteration < maxIterations) {
        changed = false;
        iteration++;

        for (const entry of candidates) {
            if (allRelevantEntries.some(e => e === entry)) continue;
            if (entry.constant) continue;

            const primaryKeys = entry.keys || [];
            const secondaryKeys = (entry.secondary_keys || entry.keysecondary) || [];
            const logic = entry.selectiveLogic ?? 5;

            const caseSensitive = entry.caseSensitive ?? globalSettings.caseSensitive ?? false;
            const wholeWords = entry.matchWholeWords ?? globalSettings.matchWholeWords ?? false;

            const checkMatch = (key, text) => {
                if (!key) return false;
                const sourceText = `${text ?? ''}`;
                const sourceKey = `${key}`;
                const flags = caseSensitive ? '' : 'i';
                let pattern = sourceKey;
                if (wholeWords) pattern = `\\b${pattern}\\b`;

                const regex = tryCreateRegex(pattern, flags);
                if (regex) {
                    return regex.test(sourceText);
                }

                // iOS WebKit can throw RangeError for pathological patterns.
                // Fallback to literal matching to avoid crashing the worker.
                const haystack = caseSensitive ? sourceText : sourceText.toLowerCase();
                const needle = caseSensitive ? sourceKey : sourceKey.toLowerCase();
                if (!needle) return false;

                if (wholeWords) {
                    const escaped = escapeRegex(needle);
                    const wordRegex = tryCreateRegex(`\\b${escaped}\\b`, caseSensitive ? '' : 'i');
                    if (wordRegex) return wordRegex.test(haystack);
                }

                return haystack.includes(needle);
            };

            const scanDepth = entry.scanDepth ?? 1;
            const messagesToScan = history.slice(-scanDepth).map(m => m.content).join("\n");

            const scanSource = caseSensitive ?
                (messagesToScan + textToScan) :
                (messagesToScan.toLowerCase() + textToScan.toLowerCase());

            let isStickyActive = false;
            let isOnCooldown = false;

            if (entry.sticky > 0 || entry.cooldown > 0) {
                for (let i = 1; i <= Math.max(entry.sticky || 0, entry.cooldown || 0); i++) {
                    const histMsg = history[history.length - i];
                    if (!histMsg) break;
                    const histSource = caseSensitive ? histMsg.content : histMsg.content.toLowerCase();
                    const wasMatched = primaryKeys.some(key => checkMatch(key, histSource));

                    if (wasMatched) {
                        if (i <= (entry.sticky || 0)) isStickyActive = true;
                        if (i <= (entry.cooldown || 0)) isOnCooldown = true;
                        break;
                    }
                }
            }

            if (isOnCooldown) continue;

            const matchedPrimary = isStickyActive || primaryKeys.some(key => checkMatch(key, scanSource));

            if (matchedPrimary) {
                let secondaryMatches = true;

                if (logic === 4 || secondaryKeys.length === 0) {
                    secondaryMatches = true;
                } else if (secondaryKeys.length > 0) {
                    const matches = secondaryKeys.map(key => checkMatch(key, scanSource));
                    const anyMatch = matches.some(m => m);
                    const allMatch = matches.every(m => m);

                    if (logic === 0) secondaryMatches = anyMatch;
                    else if (logic === 1) secondaryMatches = allMatch;
                    else if (logic === 2) secondaryMatches = !anyMatch;
                    else if (logic === 3) secondaryMatches = !allMatch;
                }

                if (secondaryMatches) {
                    if (entry.probability !== undefined && entry.probability < 100) {
                        if (Math.random() * 100 > entry.probability) continue;
                    }

                    allRelevantEntries.push(entry);

                    if (!entry.preventRecursion && iteration < maxIterations) {
                        textToScan += "\n" + (entry.content || "").toLowerCase();
                        changed = true;
                    }
                }
            }
        }
    }

    return allRelevantEntries.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

function buildPromptMessagesWorker(args) {
    const { char, history, summary, activePreset, mergePrompts, mergeRole, personaObj, authorsNote, lorebooks, globalSettings, activations, globalRegexes, sessionVars } = args;

    const messages = [];
    let mergeBuffer = [];
    let allLoreEntries = [];
    let notifyObj = { varsChanged: false };

    const charId = char?.id || "default";
    const sessionId = char?.sessionId || "current";
    const chatId = char?.id && char?.sessionId ? `${char.id}_${char.sessionId}` : null;

    // Combine regexes
    const presetRegexes = activePreset?.regexes || [];
    const allScripts = [...presetRegexes, ...globalRegexes];

    const flushMergeBuffer = () => {
        if (mergeBuffer.length > 0) {
            messages.push({ role: mergeRole || 'system', content: mergeBuffer.join('\n'), blockName: 'merged prompt' });
            mergeBuffer = [];
        }
    };

    let loreByPosition = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    if (lorebooks) {
        const loreEntries = scanLorebooksPure(history || [], char, "", chatId, lorebooks, globalSettings, activations);
        allLoreEntries = loreEntries;

        loreEntries.forEach(entry => {
            const pos = entry.position ?? 0;
            const msg = {
                role: 'system',
                content: replaceMacros(entry.content || "", char, personaObj, sessionVars, charId, sessionId, notifyObj),
                blockName: `Lorebook: ${entry.keys?.[0] || 'Entry'}`,
                isLorebook: true
            };
            if (loreByPosition[pos]) loreByPosition[pos].push(msg);
            else loreByPosition[0].push(msg);
        });
    }

    const injectLore = (pos) => {
        if (loreByPosition[pos] && loreByPosition[pos].length > 0) {
            loreByPosition[pos].forEach(msg => {
                if (mergePrompts) mergeBuffer.push(msg.content);
                else {
                    flushMergeBuffer();
                    messages.push(msg);
                }
            });
            loreByPosition[pos] = [];
        }
    };

    injectLore(4);

    let summaryText = null;
    if (summary) {
        const content = typeof summary === 'object' ? summary.content : summary;
        const prefix = (typeof summary === 'object' && summary.prefix) ? summary.prefix : 'Summary: ';
        if (content) summaryText = `[${prefix}${content}]`;
    }

    if (activePreset && activePreset.blocks) {
        const depthBlocks = [];
        const relativeBlocks = [];

        activePreset.blocks.forEach(block => {
            if (!block.enabled || block.isStashed) return;
            if (block.insertion_mode === 'depth' && block.id !== 'chat_history') {
                depthBlocks.push(block);
            } else {
                relativeBlocks.push(block);
            }
        });

        const resolveBlockContent = (block) => {
            let content = "";
            let role = block.role || "system";

            if (block.id === 'user_persona') content = `User Name: ${personaObj.name}\nUser Description: ${personaObj.prompt || ""}`;
            else if (block.id === 'char_card') content = `Character Name: ${char.name}\nDescription: ${char.description || char.desc}`;
            else if (block.id === 'char_personality') content = `Personality: ${char.personality}`;
            else if (block.id === 'scenario') content = `Scenario: ${char.scenario}`;
            else if (block.id === 'example_dialogue') content = char.mes_example || "";
            else if (block.id === 'authors_note') {
                if (authorsNote && authorsNote.content) {
                    content = authorsNote.content;
                    if (authorsNote.role) role = authorsNote.role;
                } else return null;
            }
            else if (block.id === 'summary') {
                if (summaryText) {
                    content = summaryText;
                    if (typeof summary === 'object' && summary.role) role = summary.role;
                } else return null;
            } else {
                content = block.content;
            }

            if (!content) return null;

            // Execute macros on the final block content to catch embedded setvar/getvar
            content = replaceMacros(content, char, personaObj, sessionVars, charId, sessionId, notifyObj);

            return { content, role };
        };

        const resolvedDepthBlocks = depthBlocks.map(block => {
            const resolved = resolveBlockContent(block);
            if (!resolved) return null;

            let placement = 4;
            if (resolved.role === 'user') placement = 1;
            else if (resolved.role === 'assistant') placement = 2;

            resolved.content = applyRegexes(resolved.content, placement, 2, allScripts, { char, persona: personaObj, sessionVars, charId, sessionId, notifyObj });

            return {
                role: resolved.role,
                content: resolved.content,
                blockName: block.name,
                depth: block.depth || 0,
                isDepth: true
            };
        }).filter(Boolean);

        relativeBlocks.forEach(block => {
            if (block.id === 'chat_history') {
                if (mergePrompts) flushMergeBuffer();
                Object.keys(loreByPosition).forEach(pos => injectLore(pos));

                let historyMsgs = [];
                if (history) {
                    historyMsgs = history.map((m, i) => {
                        let content = m.content !== undefined ? m.content : (m.text || m.mes || "");

                        // Macros and Regex
                        content = replaceMacros(content, char, personaObj, sessionVars, charId, sessionId, notifyObj);
                        const placement = m.role === 'user' ? 1 : 2;
                        content = applyRegexes(content, placement, 2, allScripts, { char, persona: personaObj, sessionVars, charId, sessionId, notifyObj });

                        return {
                            role: m.role || (m.isUser ? 'user' : 'assistant'),
                            content: content,
                            isHistory: true,
                            chatId: m.chatId !== undefined ? m.chatId : (m.originalIndex !== undefined ? m.originalIndex : i)
                        };
                    });
                }

                const finalHistoryWithDepth = [];
                const deepBlocks = resolvedDepthBlocks.filter(b => b.depth > historyMsgs.length);
                for (const b of deepBlocks) finalHistoryWithDepth.push(b);

                for (let i = 0; i <= historyMsgs.length; i++) {
                    const currentDepth = historyMsgs.length - i;
                    const blocksAtDepth = resolvedDepthBlocks.filter(b => b.depth === currentDepth);
                    for (const b of blocksAtDepth) finalHistoryWithDepth.push(b);

                    if (i < historyMsgs.length) {
                        finalHistoryWithDepth.push(historyMsgs[i]);
                    }
                }

                for (const m of finalHistoryWithDepth) messages.push(m);
                return;
            }

            if (block.id === 'char_card') injectLore(0);
            if (block.id === 'example_messages') injectLore(2);

            const resolved = resolveBlockContent(block);
            if (!resolved) {
                if (block.id === 'char_card') injectLore(1);
                if (block.id === 'example_messages') injectLore(3);
                return;
            }

            let { content, role } = resolved;

            if (mergePrompts && role !== 'assistant') {
                if (content) mergeBuffer.push(content);
            } else {
                if (mergePrompts) flushMergeBuffer();

                let placement = 4;
                if (role === 'user') placement = 1;
                else if (role === 'assistant') placement = 2;

                content = applyRegexes(content, placement, 2, allScripts, { char, persona: personaObj, sessionVars, charId, sessionId, notifyObj });

                const msg = { role: role, content: content, blockName: block.name };
                messages.push(msg);
            }

            if (block.id === 'char_card') injectLore(1);
            if (block.id === 'example_messages') injectLore(3);
        });
        if (mergePrompts) flushMergeBuffer();
    } else {
        messages.push({ role: "system", content: "You are a helpful assistant." });
        if (summaryText) messages.push({ role: "system", content: summaryText });
        if (history) {
            for (const m of history) {
                messages.push({ ...m, isHistory: true });
            }
        }
    }

    // Remove prompt blocks that ended up empty after macro/regex processing
    const filteredMessages = messages.filter(m => {
        if (m.isHistory) return true;
        return m.content && m.content.trim().length > 0;
    });

    return { messages: filteredMessages, loreEntries: allLoreEntries, notifyObj };
}

self.onmessage = async function (e) {
    const { id, type, payload } = e.data;

    if (type === 'calculateContext' || type === 'generateChatResponse') {
        try {
            const { messages, loreEntries, notifyObj } = buildPromptMessagesWorker(payload);

            const { apiConfig } = payload;
            const maxTokens = apiConfig.maxTokens;
            const contextSize = apiConfig.contextSize;
            const safeContext = contextSize - maxTokens;

            const staticMessages = messages.filter(m => !m.isHistory);
            let staticTokens = 0;
            for (const m of staticMessages) {
                staticTokens += estimateTokens(m.content);
            }

            let availableForHistory = safeContext - staticTokens;
            let finalMessages = [];
            let cutoffIndex = -1;

            let cutoffOriginalIndex = -1;

            if (staticTokens >= safeContext) {
                // Out of context entirely just based on prompt
                finalMessages = staticMessages;
                cutoffIndex = payload.history?.length || 0;
                cutoffOriginalIndex = Number.MAX_SAFE_INTEGER;
            } else {
                const historyMessages = messages.filter(m => m.isHistory);
                let currentHistoryTokens = 0;
                let includedCount = 0;

                for (let i = historyMessages.length - 1; i >= 0; i--) {
                    const tokens = estimateTokens(historyMessages[i].content);
                    if (currentHistoryTokens + tokens <= availableForHistory) {
                        currentHistoryTokens += tokens;
                        includedCount++;
                    } else {
                        break;
                    }
                }

                cutoffIndex = historyMessages.length - includedCount;
                const cutoffMessage = historyMessages[cutoffIndex];
                cutoffOriginalIndex = cutoffMessage !== undefined ? cutoffMessage.chatId : -1;

                const keptHistoryMessages = historyMessages.slice(cutoffIndex);

                // Reconstruct final messages array keeping the order
                for (const m of messages) {
                    if (!m.isHistory || keptHistoryMessages.includes(m)) {
                        finalMessages.push(m);
                    }
                }
            }

            self.postMessage({
                id,
                success: true,
                data: {
                    messages: finalMessages,
                    cutoffIndex,
                    cutoffOriginalIndex,
                    loreEntries,
                    staticTokens,
                    needsVarsSave: notifyObj.varsChanged,
                    sessionVars: payload.sessionVars
                }
            });
        } catch (error) {
            self.postMessage({ id, success: false, error: error.message });
        }
    }
};
