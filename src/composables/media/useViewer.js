import { ref, onMounted, onUnmounted } from 'vue';
import { logger } from '@/utils/logger.js';

export function useViewer(eventName) {
    const visible = ref(false);
    const src = ref('');
    const name = ref('');
    const description = ref('');
    let onCloseCallback = null;

    const close = () => {
        logger.debug(`[useViewer:${eventName}] close called`);
        visible.value = false;
    };

    // Call this when the closing animation finishes
    const onAfterLeave = () => {
        logger.debug(`[useViewer:${eventName}] onAfterLeave triggered`);
        if (onCloseCallback) onCloseCallback();
        onCloseCallback = null;
        src.value = '';
        name.value = '';
        description.value = '';
    };

    const open = (detail) => {
        logger.debug(`[useViewer:${eventName}] open called`, detail);
        src.value = detail.src;
        name.value = detail.name || '';
        description.value = detail.description || '';
        onCloseCallback = detail.onCloseCallback;
        visible.value = true;
    };

    const onEvent = (e) => {
        logger.debug(`[useViewer:${eventName}] Event received`);
        open(e.detail);
    };

    onMounted(() => window.addEventListener(eventName, onEvent));
    onUnmounted(() => window.removeEventListener(eventName, onEvent));

    return {
        visible, src, name, description, close, onAfterLeave
    };
}