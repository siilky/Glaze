import { translations } from './i18n.js';
import { currentLang } from './APPSettings.js';
import { attachLongPress, openBottomSheet, closeBottomSheet } from './ui.js';
import { triggerCharacterImport } from './characterImporter.js';

export let characters = [];
let onChatOpenCallback = null;
let activeActionCharIndex = -1;

export function loadCharacters() {
    const saved = localStorage.getItem('sc_characters');
    if (saved) {
        try {
            characters = JSON.parse(saved);
        } catch (e) {
            console.error("Ошибка загрузки персонажей:", e);
            characters = [];
        }
    }
}

export function saveCharacters() {
    localStorage.setItem('sc_characters', JSON.stringify(characters));
}

export function addCharacter(char) {
    characters.push(char);
    saveCharacters();
}

export function getCharacter(index) {
    return characters[index];
}

export function getCharacterByName(name) {
    return characters.find(c => c.name === name);
}

export function deleteCharacter(index) {
    if (index > -1 && index < characters.length) {
        characters.splice(index, 1);
        saveCharacters();
    }
}

export function toggleFavorite(index) {
    if (characters[index]) {
        characters[index].isFavorite = !characters[index].isFavorite;
        saveCharacters();
    }
}

export function init(chatCallback) {
    onChatOpenCallback = chatCallback;

    // Import Button Logic
    const btnImport = document.getElementById('btn-import-char');
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            triggerCharacterImport((data) => {
                const newChar = {
                    name: data.name || "Unknown",
                    description: data.description || "",
                    desc: data.description || data.creator_notes || "",
                    creator_notes: data.creator_notes || "",
                    tags: data.tags || [],
                    personality: data.personality || "",
                    scenario: data.scenario || "",
                    first_mes: data.first_mes || "",
                    mes_example: data.mes_example || "",
                    color: "#" + Math.floor(Math.random()*16777215).toString(16),
                    category: "anime",
                    version: data.character_version || "v1.0",
                    avatar: data.avatar || null
                };
                addCharacter(newChar);
                renderList();
                closeBottomSheet('char-options-sheet-overlay');
            });
        });
    }

    // FAB Listener
    const fabAdd = document.getElementById('fab-add-character');
    if (fabAdd) {
        fabAdd.addEventListener('click', () => {
            openBottomSheet('char-options-sheet-overlay');
        });
    }

    // Init Editor and Actions
    initEditor();
    initActionListeners();
    initSelectionList();
}

export function renderList(category = 'all') {
    const list = document.getElementById('characters-list');
    const favList = document.getElementById('favorites-list');
    const fabAdd = document.getElementById('fab-add-character');
    
    if (!list) return;
    list.innerHTML = '';
    if (favList) favList.innerHTML = '';

    // Render Favorites
    if (favList) {
        const favorites = characters.filter(c => c.isFavorite);
        if (favorites.length === 0) {
            favList.style.display = 'none';
        } else {
            favList.style.display = 'flex';
            
        favorites.forEach(char => {
            const el = document.createElement('div');
            el.className = 'favorite-item';
            
            let avatarHtml;
            if (char.avatar) {
                avatarHtml = `<div class="favorite-avatar"><img src="${char.avatar}" alt="${char.name}"></div>`;
            } else {
                const letter = (char.name && char.name[0]) ? char.name[0].toUpperCase() : "?";
                avatarHtml = `<div class="favorite-avatar" style="background-color: ${char.color || '#66ccff'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2em;">${letter}</div>`;
            }

            el.innerHTML = `
                ${avatarHtml}
                <div class="favorite-name">${char.name}</div>
            `;
            el.addEventListener('click', () => { if(onChatOpenCallback) onChatOpenCallback(char); });
            favList.appendChild(el);
        });
        }
    }

    // Render Main List
    characters.forEach((char, index) => {
        if (category !== 'all' && char.category !== category) return;

        const el = document.createElement('div');
        el.className = 'list-item';
        if (char.isFavorite) el.classList.add('favorite');
        
        let avatarHtml;
        if (char.avatar) {
            avatarHtml = `<div class="avatar"><img src="${char.avatar}" alt="${char.name}"></div>`;
        } else {
            const letter = (char.name && char.name[0]) ? char.name[0].toUpperCase() : "?";
            avatarHtml = `<div class="avatar" style="background-color: ${char.color || '#66ccff'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5em;">${letter}</div>`;
        }

        el.innerHTML = `
            ${avatarHtml}
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${char.name}<sup class="item-version">${char.version}</sup></span>
                </div>
                <div class="item-subtitle">${char.desc}</div>
            </div>
            <div class="item-edit-btn">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </div>
        `;
        
        const checkLongPress = attachLongPress(el, () => {
            openActions(char, index);
        });

        el.addEventListener('click', (e) => {
            if (checkLongPress()) return;
            // Check if click was on edit button
            if (e.target.closest('.item-edit-btn')) return;
            if(onChatOpenCallback) onChatOpenCallback(char);
        });

        el.querySelector('.item-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditor(index);
        });
        
        list.appendChild(el);
    });

    // Character Options Sheet Trigger
    if (fabAdd) { 
        fabAdd.style.display = ''; 
    }
}

function initEditor() {
    const editView = document.getElementById('view-character-edit');
    const avatarEl = document.getElementById('edit-char-avatar');
    const avatarInput = document.getElementById('char-avatar-upload');
    
    // Inputs
    const nameInput = document.getElementById('char-name-input');
    const descInput = document.getElementById('char-description-input');
    const creatorNotesInput = document.getElementById('char-creator-notes-input');
    const tagsInput = document.getElementById('char-tags-input');
    const personalityInput = document.getElementById('char-personality-input');
    const scenarioInput = document.getElementById('char-scenario-input');
    const firstMesInput = document.getElementById('char-first-mes-input');
    const mesExampleInput = document.getElementById('char-mes-example-input');
    const inputs = [nameInput, descInput, creatorNotesInput, tagsInput, personalityInput, scenarioInput, firstMesInput, mesExampleInput];

    let editingCharIndex = -1;
    let tempAvatar = null;
    let tempNewChar = null; // For new character creation

    // Exported function to open editor
    window.openCharacterEditor = (index) => {
        editingCharIndex = index;
        const isNew = index === -1;
        const char = isNew ? { name: "", description: "", creator_notes: "", tags: [], personality: "", scenario: "", first_mes: "", mes_example: "", avatar: null } : getCharacter(index);
        if (isNew) tempNewChar = char;

        const previousView = document.querySelector('.view.active-view');
        
        // Populate fields
        nameInput.value = char.name;
        descInput.value = char.description || char.desc || "";
        creatorNotesInput.value = char.creator_notes;
        tagsInput.value = Array.isArray(char.tags) ? char.tags.join(', ') : (char.tags || "");
        personalityInput.value = char.personality;
        scenarioInput.value = char.scenario;
        firstMesInput.value = char.first_mes;
        mesExampleInput.value = char.mes_example;
        
        tempAvatar = char.avatar;
        updateAvatarDisplay(tempAvatar, char.name);

        // Show View
        document.querySelector('.view.active-view').classList.remove('active-view');
        editView.classList.add('active-view', 'anim-fade-in');
        document.querySelector('.tabbar').style.display = 'none';

        // Header Setup
        const headerTitle = document.getElementById('header-title');
        const headerArrow = document.getElementById('header-arrow');
        const backBtn = document.getElementById('header-back');
        const headerLogo = document.getElementById('header-logo');
        const deleteBtn = document.getElementById('header-btn-delete-char');

        if(headerLogo) headerLogo.style.display = 'none';
        backBtn.style.display = 'flex';
        headerArrow.style.display = 'none';
        headerTitle.textContent = isNew ? translations[currentLang]['action_create_new'] : translations[currentLang]['header_editor'];
        if(deleteBtn) deleteBtn.style.display = isNew ? 'none' : 'flex';

        // Create/Save Button for New Character
        let createBtn = document.getElementById('header-btn-create-char');
        if (!createBtn) {
            createBtn = document.createElement('div');
            createBtn.id = 'header-btn-create-char';
            createBtn.className = 'header-btn';
            createBtn.style.alignItems = 'center';
            createBtn.style.justifyContent = 'center';
            createBtn.style.padding = '0 10px';
            createBtn.style.cursor = 'pointer';
            createBtn.style.position = 'absolute';
            createBtn.style.right = '10px';
            createBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:var(--vk-blue);"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
            // Insert before delete button or at end
            if (deleteBtn && deleteBtn.parentNode) deleteBtn.parentNode.insertBefore(createBtn, deleteBtn);
            else backBtn.parentNode.appendChild(createBtn);
            
            createBtn.addEventListener('click', () => {
                if (tempNewChar) {
                    if (!tempNewChar.name || !tempNewChar.name.trim()) {
                        alert(translations[currentLang]['placeholder_enter_name'] || "Name is required");
                        return;
                    }
                    tempNewChar.color = "#" + Math.floor(Math.random()*16777215).toString(16);
                    tempNewChar.category = "anime";
                    tempNewChar.version = "v1.0";
                    addCharacter(tempNewChar);
                    renderList();
                    backBtn.click();
                }
            });
        }
        createBtn.style.display = isNew ? 'flex' : 'none';

        // Back Button Logic
        backBtn.onclick = () => {
            // Close Editor
            editView.classList.remove('anim-fade-in');
            editView.classList.add('anim-fade-out');
            
            if (previousView) previousView.classList.add('active-view', 'anim-fade-in');

            const onAnimationEnd = () => {
                editView.classList.remove('active-view', 'anim-fade-out');
                if (previousView) previousView.classList.remove('anim-fade-in');
            };
            editView.addEventListener('animationend', onAnimationEnd, { once: true });

            // Restore Header
            if(headerLogo) headerLogo.style.display = 'flex';
            backBtn.style.display = 'none';
            if(deleteBtn) deleteBtn.style.display = 'none';
            if(createBtn) createBtn.style.display = 'none';
            
            // Restore Title & Arrow
            if (previousView) {
                const prevTab = document.querySelector(`.tab-btn[data-target="${previousView.id}"]`);
                if (prevTab) {
                    const titleKey = prevTab.getAttribute('data-i18n-title');
                    headerTitle.textContent = translations[currentLang][titleKey];
                }
                const hasDropdown = (previousView.id === 'view-dialogs' || previousView.id === 'view-characters');
                headerArrow.style.display = hasDropdown ? 'block' : 'none';
            }

            document.querySelector('.tabbar').style.display = 'flex';
            renderList(); // Refresh list
        };

        // Delete Button Logic
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                openBottomSheet('char-delete-confirm-sheet');
            };
        }

        // Confirm Delete Logic
        const confirmDeleteBtn = document.getElementById('btn-confirm-delete-char');
        const cancelDeleteBtn = document.getElementById('btn-cancel-delete-char');

        const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
        confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            deleteCharacter(editingCharIndex);
            closeBottomSheet('char-delete-confirm-sheet');
            backBtn.click();
        });

        cancelDeleteBtn.onclick = () => closeBottomSheet('char-delete-confirm-sheet');
    };

    function updateAvatarDisplay(src, name) {
        if (src) {
            avatarEl.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
             avatarEl.innerHTML = `<div style="width:100%;height:100%;background-color:#66ccff;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:2em;">${(name||"?")[0]}</div>`;
        }
    }

    const autoSave = () => {
        if (editingCharIndex > -1) {
            const char = getCharacter(editingCharIndex);
            char.name = nameInput.value;
            char.description = descInput.value;
            char.desc = descInput.value;
            char.creator_notes = creatorNotesInput.value;
            char.tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
            char.personality = personalityInput.value;
            char.scenario = scenarioInput.value;
            char.first_mes = firstMesInput.value;
            char.mes_example = mesExampleInput.value;
            char.avatar = tempAvatar;
            saveCharacters();
        } else if (tempNewChar) {
            // Update temp object for new character
            tempNewChar.name = nameInput.value;
            tempNewChar.description = descInput.value;
            tempNewChar.desc = descInput.value;
            tempNewChar.creator_notes = creatorNotesInput.value;
            tempNewChar.tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
            tempNewChar.personality = personalityInput.value;
            tempNewChar.scenario = scenarioInput.value;
            tempNewChar.first_mes = firstMesInput.value;
            tempNewChar.mes_example = mesExampleInput.value;
            tempNewChar.avatar = tempAvatar;
        }
    };

    inputs.forEach(input => input.addEventListener('input', autoSave));

    avatarEl.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                tempAvatar = ev.target.result;
                updateAvatarDisplay(tempAvatar, nameInput.value);
                autoSave();
            };
            reader.readAsDataURL(file);
        }
    });
}

function openEditor(index) {
    if (window.openCharacterEditor) window.openCharacterEditor(index);
}

function openActions(char, index) {
    activeActionCharIndex = index;
    const title = document.getElementById('char-actions-title');
    const favBtn = document.getElementById('btn-char-favorite');
    const favLabel = document.getElementById('lbl-char-favorite');
    
    if (title) {
        title.textContent = char.name;
        
        // Update Favorite Button State
        const favIconContainer = favBtn.querySelector('.sheet-item-icon');
        if (char.isFavorite) {
            favLabel.textContent = translations[currentLang]['action_remove_fav'];
            favIconContainer.style.fill = '#ff4444';
            favIconContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/><line x1="4" y1="4" x2="20" y2="20" stroke="#ff4444" stroke-width="2" /></svg>`;
        } else {
            favLabel.textContent = translations[currentLang]['action_add_fav'];
            favIconContainer.style.fill = 'var(--text-gray)';
            favIconContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        }
        
        const newFavBtn = favBtn.cloneNode(true);
        favBtn.parentNode.replaceChild(newFavBtn, favBtn);
        
        newFavBtn.addEventListener('click', () => {
            toggleFavorite(activeActionCharIndex);
            renderList();
            closeBottomSheet('char-actions-sheet-overlay');
        });

        openBottomSheet('char-actions-sheet-overlay');
    }
}

function initActionListeners() {
    document.getElementById('btn-char-new-version').addEventListener('click', () => {
        console.log('New Version');
        closeBottomSheet('char-actions-sheet-overlay');
    });
    document.getElementById('btn-char-delete').addEventListener('click', () => {
        // Logic handled in editor now
        closeBottomSheet('char-actions-sheet-overlay');
    });
    
    // Create New Character (from Options Sheet)
    document.getElementById('btn-create-char').addEventListener('click', () => {
        closeBottomSheet('char-options-sheet-overlay');
        // Open editor for new character (index -1)
        openEditor(-1);
    });
}

function initSelectionList() {
    const fabDialog = document.getElementById('fab-add-dialog');
    if (fabDialog) {
        fabDialog.addEventListener('click', () => {
            renderSelectionList();
            openBottomSheet('char-selection-sheet-overlay');
        });
    }
}

function renderSelectionList() {
    const charSelectionList = document.getElementById('char-selection-list');
    if (!charSelectionList) return;
    
    charSelectionList.innerHTML = '';
    characters.forEach(char => {
        const item = document.createElement('div');
        item.className = 'sheet-item';
        
        let avatarHtml;
        if (char.avatar) {
            avatarHtml = `<div class="avatar" style="width:40px;height:40px;"><img src="${char.avatar}" style="width:100%;height:100%;object-fit:cover;"></div>`;
        } else {
            const letter = (char.name && char.name[0]) ? char.name[0].toUpperCase() : "?";
            avatarHtml = `<div class="avatar" style="width:40px;height:40px;background-color:${char.color||'#ccc'};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">${letter}</div>`;
        }

        item.innerHTML = `${avatarHtml}<div class="sheet-item-content">${char.name}</div>`;
        item.addEventListener('click', () => {
            if(onChatOpenCallback) onChatOpenCallback(char);
            closeBottomSheet('char-selection-sheet-overlay');
        });
        charSelectionList.appendChild(item);
    });
}