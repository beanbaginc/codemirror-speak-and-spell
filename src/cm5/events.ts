/**
 * Event handling for the plugin.
 *
 * Version Added:
 *     1.0
 */

import type * as CodeMirror from 'codemirror';

import { findOffsetsForRange } from './cmUtils';
import { type SpeakAndSpellState } from './state';


/**
 * Handle beforeinput events on the CodeMirror input element.
 *
 * This will listen for events that correspond to text inserts or
 * replacements, which would be sent by spell checking corrections,
 * speech-to-text, or other forms of text generation or manipulation.
 *
 * Based on the event, this may cancel the default browser behavior and
 * initiate the operation directly in CodeMirror.
 *
 * Version Added:
 *     1.0
 *
 * Args:
 *     state (SpeakAndSpellState):
 *         The current plugin state.
 *
 *     evt (InputEvent):
 *         The input event to process.
 */
export function onBeforeInput(
    state: SpeakAndSpellState,
    evt: InputEvent,
) {
    if (evt.inputType !== 'insertReplacementText' &&
        evt.inputType !== 'insertText') {
        /*
         * We only want to handle replacements to the text or new
         * inserts. Ignore this.
         */
        return;
    }

    /*
     * This may be a spell checking replacement, auto-correct (if it were
     * enabled), writing suggestion, or similar.
     *
     * If we have the state we expect, we'll skip the browser's default
     * behavior and use CodeMirror to replace the string, so it doesn't
     * have to fight the DOM.
     *
     * First, grab the ranges from the event. This might be empty, which
     * would have been the case on some versions of Chrome I tested with
     * before.  Play it safe, bail if we can't find a range.
     *
     * Each range will have an offset in a start container and an offset
     * in an end container. These containers may be text nodes or some
     * parent node (up to and including the contenteditable node).
     */
    const ranges = evt.getTargetRanges();

    if (!ranges || ranges.length === 0) {
        /* We got empty ranges. There's nothing to do. */
        return;
    }

    const newText = evt.data ?? evt.dataTransfer?.getData('text') ?? null;

    if (newText === null) {
        /* We couldn't retrieve the text. There's nothing to do. */
        return;
    }

    /*
     * We'll take over from here. We don't want the browser messing with
     * any state and impacting CodeMirror. Instead, we'll run the
     * operations through CodeMirror.
     */
    evt.preventDefault();
    evt.stopPropagation();

    const cm = state.cm;

    for (const range of ranges) {
        const [startOffset, endOffset] = findOffsetsForRange(state, range);

        cm.replaceRange(newText, startOffset, endOffset, '+input');
    }
}
