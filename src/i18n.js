import ru from './languages/ru.json';
import en from './languages/en.json';
import { currentLang } from './APPSettings.js';
import { refreshPromptBlocks } from './promptBuilder.js';

export const translations = {
    ru,
    en
};

export function updateLanguage() {
    const i18nElements = document.querySelectorAll('[data-i18n]');
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    const headerTitle = document.getElementById('header-title');
    const promptList = document.getElementById('prompt-blocks-list');
    
    const elementsToAnimate = [...i18nElements, ...placeholderElements];
    if (headerTitle) elementsToAnimate.push(headerTitle);
    if (promptList) elementsToAnimate.push(promptList);

    // Fade Out
    elementsToAnimate.forEach(el => {
        el.style.transition = 'opacity 0.15s ease';
        el.style.opacity = '0';
    });

    setTimeout(() => {
        // Update elements with data-i18n
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[currentLang][key]) {
                el.textContent = translations[currentLang][key];
            }
        });

        // Update placeholders
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[currentLang][key]) {
                el.placeholder = translations[currentLang][key];
            }
        });

        // Update Header Title based on active tab
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && headerTitle) {
             const titleKey = activeTab.getAttribute('data-i18n-title');
             if (titleKey && translations[currentLang][titleKey]) {
                 headerTitle.textContent = translations[currentLang][titleKey];
             }
        }

        // Refresh prompt blocks to update translations
        refreshPromptBlocks();

        // Fade In
        elementsToAnimate.forEach(el => {
            el.style.opacity = '1';
        });

        // Cleanup
        setTimeout(() => {
            elementsToAnimate.forEach(el => {
                el.style.transition = '';
                el.style.opacity = '';
            });
        }, 150);
    }, 150);
}