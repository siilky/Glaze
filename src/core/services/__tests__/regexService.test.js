import { describe, it, expect, vi } from 'vitest';
import { applyRegexes } from '../regexService.js';

// Mock presetState
vi.mock('@/core/states/presetState.js', () => ({
    getEffectivePreset: vi.fn()
}));

describe('Regex Service', () => {
    // --- Basic Functionality ---

    it('applies basic replacement', () => {
        const scripts = [{
            id: '1',
            name: 'Test Replace',
            regex: 'apple',
            replacement: 'banana',
            placement: [1],
            ephemerality: [1],
            disabled: false
        }];
        const result = applyRegexes('I have an apple', 1, 1, { globalScripts: scripts });
        expect(result).toBe('I have an banana');
    });

    it('replaces all occurrences globally', () => {
        const scripts = [{
            id: '1',
            regex: 'cat',
            replacement: 'dog',
            placement: [1, 2],
            ephemerality: [1],
            disabled: false
        }];
        const result = applyRegexes('cat and cat and cat', 1, 1, { globalScripts: scripts });
        expect(result).toBe('dog and dog and dog');
    });

    it('returns empty string for empty/null input', () => {
        const scripts = [{
            id: '1',
            regex: 'test',
            replacement: 'ok',
            placement: [1],
            ephemerality: [1],
            disabled: false
        }];
        expect(applyRegexes('', 1, 1, { globalScripts: scripts })).toBe('');
        expect(applyRegexes(null, 1, 1, { globalScripts: scripts })).toBe('');
        expect(applyRegexes(undefined, 1, 1, { globalScripts: scripts })).toBe('');
    });

    // --- Trim Tokens ---

    it('handles trimOut (multiple lines)', () => {
        const scripts = [{
            id: '1',
            trimOut: 'bad\nugly',
            placement: [1],
            ephemerality: [1],
            disabled: false
        }];
        const result = applyRegexes('The bad and the ugly', 1, 1, { globalScripts: scripts });
        expect(result).toBe('The  and the ');
    });

    it('trimOut removes all occurrences', () => {
        const scripts = [{
            id: '1',
            trimOut: 'um',
            placement: [1, 2],
            ephemerality: [1],
            disabled: false
        }];
        const result = applyRegexes('um well um I think um', 1, 1, { globalScripts: scripts });
        expect(result).toBe(' well  I think ');
    });

    it('trimOut ignores empty lines', () => {
        const scripts = [{
            id: '1',
            trimOut: 'foo\n\n\nbar',
            placement: [1],
            ephemerality: [1],
            disabled: false
        }];
        const result = applyRegexes('foo and bar', 1, 1, { globalScripts: scripts });
        expect(result).toBe(' and ');
    });

    // --- Placement & Ephemerality Filters ---

    it('filters by placement and ephemerality', () => {
        const scripts = [{
            id: '1',
            regex: 'secret',
            replacement: 'REDACTED',
            placement: [2],       // AI Output only
            ephemerality: [2],    // Prompt only
            disabled: false
        }];

        // Should NOT match: placement=1 (User), ephemerality=2 (Prompt)
        expect(applyRegexes('secret', 1, 2, { globalScripts: scripts })).toBe('secret');

        // Should NOT match: placement=2 (AI), ephemerality=1 (Display)
        expect(applyRegexes('secret', 2, 1, { globalScripts: scripts })).toBe('secret');

        // Should match: placement=2, ephemerality=2
        expect(applyRegexes('secret', 2, 2, { globalScripts: scripts })).toBe('REDACTED');
    });

    it('applies to all placements when placement is not set', () => {
        const scripts = [{
            id: '1',
            regex: 'hello',
            replacement: 'hi',
            ephemerality: [1],
            disabled: false
        }];
        expect(applyRegexes('hello', 1, 1, { globalScripts: scripts })).toBe('hi');
        expect(applyRegexes('hello', 2, 1, { globalScripts: scripts })).toBe('hi');
    });

    it('applies to all ephemeralities when ephemerality is not set', () => {
        const scripts = [{
            id: '1',
            regex: 'hello',
            replacement: 'hi',
            placement: [1],
            disabled: false
        }];
        expect(applyRegexes('hello', 1, 1, { globalScripts: scripts })).toBe('hi');
        expect(applyRegexes('hello', 1, 2, { globalScripts: scripts })).toBe('hi');
    });

    // --- Disabled Scripts ---

    it('skips disabled scripts', () => {
        const scripts = [{
            id: '1',
            regex: 'test',
            replacement: 'passed',
            placement: [1],
            ephemerality: [1],
            disabled: true
        }];
        expect(applyRegexes('test', 1, 1, { globalScripts: scripts })).toBe('test');
    });

    // --- Error Handling ---

    it('handles invalid regex gracefully', () => {
        const scripts = [{
            id: '1',
            regex: '[',  // Invalid regex
            replacement: '!',
            placement: [1],
            ephemerality: [1],
            disabled: false
        }];
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const result = applyRegexes('test', 1, 1, { globalScripts: scripts });
        expect(result).toBe('test');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('supports /pattern/flags format (ST compatible)', () => {
        const scripts = [{
            id: '1',
            regex: '/apple/i',
            replacement: 'banana',
            placement: [1],
            ephemerality: [1],
            disabled: false
        }];
        // Should match Case Insensitive
        expect(applyRegexes('I have an APPLE', 1, 1, { globalScripts: scripts })).toBe('I have an banana');

        // Should handle /s (dotAll) flag
        scripts[0].regex = '/a.b/s';
        scripts[0].replacement = 'match';
        expect(applyRegexes('a\nb', 1, 1, { globalScripts: scripts })).toBe('match');
    });

    // --- Chat Message Scenarios ---

    describe('Chat messages - AI Output display (placement=2, ephemerality=1)', () => {
        const placement = 2;
        const ephemerality = 1;

        it('strips OOC markers from AI response', () => {
            const scripts = [{
                id: '1',
                regex: '\\(OOC:.*?\\)',
                replacement: '',
                placement: [2],
                ephemerality: [1],
                disabled: false
            }];
            const text = '*She smiles softly.* (OOC: I think we should continue the scene) "Hello!"';
            const result = applyRegexes(text, placement, ephemerality, { globalScripts: scripts });
            expect(result).toBe('*She smiles softly.*  "Hello!"');
        });

        it('replaces character name placeholder {{char}} in AI output', () => {
            const scripts = [{
                id: '1',
                regex: '\\{\\{char\\}\\}',
                replacement: 'Alice',
                placement: [2],
                ephemerality: [1],
                disabled: false
            }];
            const text = '{{char}} walked into the room. "Hello," said {{char}}.';
            const result = applyRegexes(text, placement, ephemerality, { globalScripts: scripts });
            expect(result).toBe('Alice walked into the room. "Hello," said Alice.');
        });

        it('replaces {{user}} placeholder in AI output', () => {
            const scripts = [{
                id: '1',
                regex: '\\{\\{user\\}\\}',
                replacement: 'Bob',
                placement: [2],
                ephemerality: [1],
                disabled: false
            }];
            const text = '"Nice to meet you, {{user}}," she said to {{user}}.';
            const result = applyRegexes(text, placement, ephemerality, { globalScripts: scripts });
            expect(result).toBe('"Nice to meet you, Bob," she said to Bob.');
        });

        it('removes reasoning/thinking blocks from display', () => {
            const scripts = [{
                id: '1',
                regex: '<thinking>[\\s\\S]*?</thinking>',
                replacement: '',
                placement: [2],
                ephemerality: [1],
                disabled: false
            }];
            const text = '<thinking>I need to respond in character...</thinking>*She waves.* "Hey there!"';
            const result = applyRegexes(text, placement, ephemerality, { globalScripts: scripts });
            expect(result).toBe('*She waves.* "Hey there!"');
        });

        it('handles multiline AI output with regex', () => {
            const scripts = [{
                id: '1',
                regex: '\\[System Note:.*?\\]',
                replacement: '',
                placement: [2],
                ephemerality: [1],
                disabled: false
            }];
            const text = '*She looks around.*\n[System Note: Stay in character]\n"Hello!"';
            const result = applyRegexes(text, placement, ephemerality, { globalScripts: scripts });
            expect(result).toBe('*She looks around.*\n\n"Hello!"');
        });
    });

    describe('Chat messages - User Input display (placement=1, ephemerality=1)', () => {
        const placement = 1;
        const ephemerality = 1;

        it('replaces {{user}} in user message for display', () => {
            const scripts = [{
                id: '1',
                regex: '\\{\\{user\\}\\}',
                replacement: 'Bob',
                placement: [1],
                ephemerality: [1],
                disabled: false
            }];
            const result = applyRegexes('I am {{user}}.', placement, ephemerality, { globalScripts: scripts });
            expect(result).toBe('I am Bob.');
        });
    });

    describe('Chat messages - Outgoing prompt (placement=2, ephemerality=2)', () => {
        const placement = 2;
        const ephemerality = 2;

        it('modifies AI text in outgoing prompt only', () => {
            const scripts = [{
                id: '1',
                regex: '\\bAlice\\b',
                replacement: '{{char}}',
                placement: [2],
                ephemerality: [2],
                disabled: false
            }];
            const text = 'Alice walked home.';
            // Should apply for prompt
            expect(applyRegexes(text, 2, 2, { globalScripts: scripts })).toBe('{{char}} walked home.');
            // Should NOT apply for display
            expect(applyRegexes(text, 2, 1, { globalScripts: scripts })).toBe('Alice walked home.');
        });
    });

    // --- Multiple Scripts ---

    describe('Multiple scripts', () => {
        it('applies scripts in order', () => {
            const scripts = [
                {
                    id: '1',
                    regex: 'aaa',
                    replacement: 'bbb',
                    placement: [1],
                    ephemerality: [1],
                    disabled: false
                },
                {
                    id: '2',
                    regex: 'bbb',
                    replacement: 'ccc',
                    placement: [1],
                    ephemerality: [1],
                    disabled: false
                }
            ];
            // aaa -> bbb -> ccc (second script transforms result of first)
            const result = applyRegexes('aaa', 1, 1, { globalScripts: scripts });
            expect(result).toBe('ccc');
        });

        it('applies both trimOut and regex from same script', () => {
            const scripts = [{
                id: '1',
                trimOut: 'REMOVE_ME',
                regex: 'foo',
                replacement: 'bar',
                placement: [1],
                ephemerality: [1],
                disabled: false
            }];
            const result = applyRegexes('REMOVE_ME foo test', 1, 1, { globalScripts: scripts });
            expect(result).toBe(' bar test');
        });

        it('mixed disabled and active scripts', () => {
            const scripts = [
                {
                    id: '1',
                    regex: 'hello',
                    replacement: 'HIDDEN',
                    placement: [1],
                    ephemerality: [1],
                    disabled: true
                },
                {
                    id: '2',
                    regex: 'world',
                    replacement: 'earth',
                    placement: [1],
                    ephemerality: [1],
                    disabled: false
                }
            ];
            const result = applyRegexes('hello world', 1, 1, { globalScripts: scripts });
            expect(result).toBe('hello earth');
        });
    });

    // --- Capture Groups ---

    describe('Capture groups in replacement', () => {
        it('supports $1 capture group in replacement', () => {
            const scripts = [{
                id: '1',
                regex: '\\*\\*(.*?)\\*\\*',
                replacement: '<b>$1</b>',
                placement: [2],
                ephemerality: [1],
                disabled: false
            }];
            const result = applyRegexes('She said **hello** loudly.', 2, 1, { globalScripts: scripts });
            expect(result).toBe('She said <b>hello</b> loudly.');
        });

        it('supports multiple capture groups', () => {
            const scripts = [{
                id: '1',
                regex: '(\\w+)@(\\w+)',
                replacement: '$1 at $2',
                placement: [1],
                ephemerality: [1],
                disabled: false
            }];
            const result = applyRegexes('Contact: user@domain', 1, 1, { globalScripts: scripts });
            expect(result).toBe('Contact: user at domain');
        });
    });

    // --- Edge Cases ---

    describe('Edge cases', () => {
        it('replacement with empty string (deletion)', () => {
            const scripts = [{
                id: '1',
                regex: '\\s+',
                replacement: '',
                placement: [1],
                ephemerality: [1],
                disabled: false
            }];
            const result = applyRegexes('h e l l o', 1, 1, { globalScripts: scripts });
            expect(result).toBe('hello');
        });

        it('handles special characters in replacement', () => {
            const scripts = [{
                id: '1',
                regex: 'plain',
                replacement: '<em>fancy</em>',
                placement: [2],
                ephemerality: [1],
                disabled: false
            }];
            const result = applyRegexes('A plain day.', 2, 1, { globalScripts: scripts });
            expect(result).toBe('A <em>fancy</em> day.');
        });

        it('regex with no replacement defaults to empty string', () => {
            const scripts = [{
                id: '1',
                regex: 'remove_this',
                placement: [1],
                ephemerality: [1],
                disabled: false
            }];
            const result = applyRegexes('keep remove_this text', 1, 1, { globalScripts: scripts });
            expect(result).toBe('keep  text');
        });

        it('handles no scripts gracefully', () => {
            const result = applyRegexes('hello world', 1, 1, { globalScripts: [] });
            expect(result).toBe('hello world');
        });
    });
});
