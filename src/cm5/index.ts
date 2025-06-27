/**
 * Main setup for the Speak-and-Spell plugin.
 *
 * Version Added:
 *     1.0
 */

import * as CodeMirror from 'codemirror';

import { onBeforeInput } from './events';
import {
    clearSpeakAndSpellState,
    setupSpeakAndSpellState,
} from './state';


/*
 * Register the plugin. It'll activate when using ``speakAndSpell: true``.
 */
CodeMirror.defineOption('speakAndSpell', false, function(
    cm: CodeMirror.Editor,
    enabled: boolean,
    oldEnabled: boolean,
) {
    if (oldEnabled && oldEnabled !== (CodeMirror as any).Init) {
        clearSpeakAndSpellState(cm);
    }

    if (enabled) {
        setupSpeakAndSpellState(cm, onBeforeInput);
    }
});
