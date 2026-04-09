import { reactive } from 'vue';

const state = reactive({
    visible: false,
    text: '',
    duration: 2500,
    _timer: null,
});

/**
 * Show a custom in-app toast.
 * @param {string} text — message to display
 * @param {number} [duration=2500] — auto-dismiss in ms
 */
export function showToast(text, duration = 2500) {
    if (state._timer) clearTimeout(state._timer);
    state.text = text;
    state.visible = true;
    state.duration = duration;
    state._timer = setTimeout(() => {
        state.visible = false;
        state._timer = null;
    }, duration);
}

export function hideToast() {
    if (state._timer) { clearTimeout(state._timer); state._timer = null; }
    state.visible = false;
}

export { state as toastState };
