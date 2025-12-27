/**
 * Утилита для импорта карточек персонажей (SillyTavern V2 JSON).
 */

/**
 * Парсит содержимое файла карточки.
 * @param {File} file - Файл, полученный из input[type="file"]
 * @returns {Promise<Object>} - Объект с данными персонажа
 */
export async function parseCharacterCard(file) {
    if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
        return await parsePng(file);
    } else {
        return await parseJson(file);
    }
}

function parseJson(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const json = JSON.parse(text);
                resolve(normalizeCharacterData(json));
            } catch (err) {
                reject(new Error("Ошибка чтения JSON: " + err.message));
            }
        };
        
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
}

async function parsePng(file) {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Проверка сигнатуры PNG
    if (uint8Array[0] !== 137 || uint8Array[1] !== 80 || uint8Array[2] !== 78 || uint8Array[3] !== 71) {
        throw new Error("Невалидный PNG файл");
    }

    let offset = 8;
    let charaData = null;
    const textDecoder = new TextDecoder('utf-8');

    while (offset < arrayBuffer.byteLength) {
        const length = dataView.getUint32(offset);
        offset += 4;
        const type = textDecoder.decode(uint8Array.slice(offset, offset + 4));
        offset += 4;

        if (type === 'tEXt') {
            const chunkData = uint8Array.slice(offset, offset + length);
            let nullIndex = -1;
            for (let i = 0; i < chunkData.length; i++) {
                if (chunkData[i] === 0) {
                    nullIndex = i;
                    break;
                }
            }

            if (nullIndex !== -1) {
                const keyword = textDecoder.decode(chunkData.slice(0, nullIndex));
                if (keyword === 'chara') {
                    const base64Text = textDecoder.decode(chunkData.slice(nullIndex + 1));
                    try {
                        // Исправление кодировки: декодируем Base64 в байты, а затем в UTF-8
                        const binaryString = atob(base64Text);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const jsonStr = new TextDecoder('utf-8').decode(bytes);
                        charaData = JSON.parse(jsonStr);
                    } catch (e) {
                        console.error("Ошибка декодирования base64 из PNG:", e);
                    }
                }
            }
        }
        offset += length + 4; // Data + CRC
    }

    if (!charaData) throw new Error("В PNG файле не найдено данных персонажа (tEXt chunk 'chara')");

    // Конвертируем само изображение в base64 для аватарки
    const avatarBase64 = await fileToBase64(file);
    const normalized = normalizeCharacterData(charaData);
    normalized.avatar = avatarBase64; // Приоритет аватарки из файла
    
    return normalized;
}

function normalizeCharacterData(json) {
    if (json.spec === 'chara_card_v2' && json.data) {
        return json.data;
    }
    if (json.name) {
        return json;
    }
    throw new Error("Неизвестный формат данных персонажа");
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Создает скрытый input для выбора файла и запускает процесс импорта.
 * @param {Function} onImport - Коллбэк, который будет вызван с данными персонажа после успешного импорта.
 */
export function triggerCharacterImport(onImport) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,.png,image/png'; // JSON и PNG
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const characterData = await parseCharacterCard(file);
            if (onImport) {
                onImport(characterData);
            }
        } catch (error) {
            console.error("Import failed:", error);
            alert("Не удалось импортировать персонажа: " + error.message);
        }
    };
    
    input.click();
}