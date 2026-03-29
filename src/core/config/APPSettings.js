import { logger } from '../../utils/logger.js';
const savedLang = localStorage.getItem('gz_lang');
const systemLang = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
export let currentLang = savedLang || systemLang;

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('gz_lang', lang);
}

export let themeMode = localStorage.getItem('gz_theme') || 'system';
export function setThemeMode(mode) {
    themeMode = mode;
    localStorage.setItem('gz_theme', mode);
}
export function getThemeMode() {
    return themeMode;
}

export let imageViewerMode = localStorage.getItem('gz_image_viewer') || 'default';
logger.debug('[APPSettings] Initial imageViewerMode:', imageViewerMode);

export function setImageViewerMode(mode) {
    logger.debug('[APPSettings] setImageViewerMode:', mode);
    imageViewerMode = mode;
    localStorage.setItem('gz_image_viewer', mode);
}

export let disableSwipeRegeneration = localStorage.getItem('gz_disable_swipe_regeneration') === 'true';

export function setDisableSwipeRegeneration(value) {
    disableSwipeRegeneration = value;
    localStorage.setItem('gz_disable_swipe_regeneration', value);
}

export let hideMessageId = localStorage.getItem('gz_hide_msg_id') === 'true';
export function setHideMessageId(value) {
    hideMessageId = value;
    localStorage.setItem('gz_hide_msg_id', value);
}

export let hideGenerationTime = localStorage.getItem('gz_hide_gen_time') === 'true';
export function setHideGenerationTime(value) {
    hideGenerationTime = value;
    localStorage.setItem('gz_hide_gen_time', value);
}

export let hideTokenCount = localStorage.getItem('gz_hide_token_count') === 'true';
export function setHideTokenCount(value) {
    hideTokenCount = value;
    localStorage.setItem('gz_hide_token_count', value);
}
