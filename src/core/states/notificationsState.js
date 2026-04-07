import { reactive } from 'vue';

const STORAGE_KEY = 'gz_notifications';
const MAX_ITEMS = 20;

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const state = reactive({
    items: load(),
    unreadCount: 0,
});

/**
 * Add a notification to the history panel.
 * @param {string} text — notification text
 * @param {string} [type] — optional type tag (e.g. 'info', 'error')
 */
export function addNotification(text, type = 'info') {
    state.items.unshift({ text, time: Date.now(), type });
    if (state.items.length > MAX_ITEMS) state.items.length = MAX_ITEMS;
    state.unreadCount++;
    save(state.items);
}

export function clearUnread() {
    state.unreadCount = 0;
}

export { state as notificationsState };
