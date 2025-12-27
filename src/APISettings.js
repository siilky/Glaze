export function initSettings() {
    // API Settings Logic (Sliders)
    const rangeConfigs = [
        { slider: 'api-temp', input: 'val-temp-input', key: 'sc_api_temp', def: 0.7 },
        { slider: 'api-topp', input: 'val-topp-input', key: 'sc_api_topp', def: 0.9 }
    ];

    rangeConfigs.forEach(config => {
        const slider = document.getElementById(config.slider);
        const input = document.getElementById(config.input);
        
        // Load saved values
        const saved = localStorage.getItem(config.key);
        const val = saved !== null ? saved : config.def;
        if (slider) slider.value = val;
        if (input) input.value = val;

        if (slider) {
            slider.addEventListener('input', () => {
                if (input) input.value = slider.value;
                localStorage.setItem(config.key, slider.value);
            });
        }
        if (input) {
            input.addEventListener('input', () => {
                if (slider) slider.value = input.value;
                localStorage.setItem(config.key, input.value);
            });
        }
    });

    // Text Inputs for API Settings
    const apiInputs = [
        { id: 'api-endpoint', key: 'api-endpoint' },
        { id: 'api-key', key: 'api-key' },
        { id: 'api-model', key: 'api-model' },
        { id: 'api-max-tokens', key: 'api-max-tokens' },
        { id: 'api-context', key: 'api-context' }
    ];

    apiInputs.forEach(config => {
        const el = document.getElementById(config.id);
        if (el) {
            const saved = localStorage.getItem(config.key);
            if (saved) el.value = saved;
            
            const save = () => localStorage.setItem(config.key, el.value.trim());
            el.addEventListener('input', save);
            el.addEventListener('change', save);
        }
    });
}