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
        { id: 'api-context', key: 'api-context' },
        { id: 'api-reasoning-start', key: 'sc_api_reasoning_start' },
        { id: 'api-reasoning-end', key: 'sc_api_reasoning_end' }
    ];

    apiInputs.forEach(config => {
        const el = document.getElementById(config.id);
        if (el) {
            const saved = localStorage.getItem(config.key);
            if (saved) el.value = saved;
            
            const save = (e) => {
                let val = el.value.trim();
                if (config.id === 'api-endpoint') {
                    let normalized = val;
                    if (normalized) {
                        if (!/^https?:\/\//i.test(normalized)) {
                            normalized = 'https://' + normalized;
                        }
                        if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);

                        const suffix = '/chat/completions';
                        if (normalized.toLowerCase().endsWith(suffix)) {
                            normalized = normalized.slice(0, -suffix.length);
                        }
                        if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);

                        if (!normalized.endsWith('/v1')) normalized += '/v1';
                        localStorage.setItem('sc_api_endpoint_normalized', normalized);
                    }
                }
                localStorage.setItem(config.key, val);
            };
            el.addEventListener('input', save);
            el.addEventListener('change', save);
        }
    });

    // Checkbox for Stream
    const streamEl = document.getElementById('api-stream');
    if (streamEl) {
        const saved = localStorage.getItem('sc_api_stream');
        streamEl.checked = saved === 'true';
        streamEl.addEventListener('change', () => {
            localStorage.setItem('sc_api_stream', streamEl.checked);
        });
    }

    // Checkbox for Request Reasoning
    const reasoningEl = document.getElementById('api-reasoning');
    if (reasoningEl) {
        const saved = localStorage.getItem('sc_api_request_reasoning');
        reasoningEl.checked = saved === 'true';
        reasoningEl.addEventListener('change', () => {
            localStorage.setItem('sc_api_request_reasoning', reasoningEl.checked);
        });
    }
}