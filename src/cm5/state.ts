/**
 * State management for the Speak-and-Spell plugin.
 *
 * Version Added:
 *     1.0
 */

import type * as CodeMirror from 'codemirror';


/**
 * State for the plugin.
 *
 * Version Added:
 *     1.0
 */
export interface SpeakAndSpellState {
    /** The CodeMirror element. */
    cm: CodeMirror.Editor;

    /** The CodeMirror input element. */
    inputEl: HTMLElement;

    /** The beforeinput handler on the input element. */
    beforeInputHandler: (evt: InputEvent) => void;
}


/**
 * Set up state for the plugin.
 *
 * Version Added:
 *     1.0
 *
 * Args:
 *     cm (CodeMirror.Editor):
 *         The CodeMirror instance.
 *
 *     onBeforeInput (function):
 *         The function to call when ``beforeinput`` is triggered.
 */
export function setupSpeakAndSpellState(
    cm: CodeMirror.Editor,
    onBeforeInput: (SpeakAndSpellState, InputEvent) => void,
) {
    const inputEl = (cm as any).display.input.div;

    const handler = (evt: InputEvent) => onBeforeInput(state, evt);
    inputEl.addEventListener('beforeinput', handler);

    const state: SpeakAndSpellState = {
        cm: cm,
        inputEl: inputEl,
        beforeInputHandler: handler,
    };
    (cm as any)._speakAndSpellState = state;
}


/**
 * Clear state for the plugin.
 *
 * Version Added:
 *     1.0
 *
 * Args:
 *     cm (CodeMirror.Editor):
 *         The CodeMirror instance.
 */
export function clearSpeakAndSpellState(
    cm: CodeMirror.Editor,
) {
    const state = (cm as any)._speakAndSpellState || null;

    if (state) {
        state.inputEl.removeEventListener('beforeinput',
                                          state.beforeInputHandler);
        (cm as any)._speakAndSpellState = null;
    }
}
