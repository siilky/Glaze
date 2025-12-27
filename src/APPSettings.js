const savedLang = localStorage.getItem('sc_lang');
const systemLang = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
export let currentLang = savedLang || systemLang;

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('sc_lang', lang);
}