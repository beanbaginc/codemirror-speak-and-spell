/**
 * CodeMirror utility functions.
 *
 * Version Added:
 *     1.0
 */

import { type Position } from 'codemirror';
import { type SpeakAndSpellState } from './state';


/**
 * Find the character offset within a line to the start of a node.
 *
 * This walks from the start of the CodeMiror line element to the provided
 * node, counting the number of characters before the node.
 *
 * The node may be a text node or an element. It must live within a
 * ``.CodeMirror-line`` element, but does not need to be an immediate
 * descendant.
 *
 * Version Added:
 *     1.0
 *
 * Args:
 *     targetNode (Node):
 *         The target node within a line.
 *
 * Returns:
 *     number:
 *     The number of characters preceding the node.
 */
function _findCharOffsetForNode(
    targetNode: Node,
): number {
    const targetEl = (targetNode.nodeType === Node.ELEMENT_NODE)
                      ? targetNode as HTMLElement
                      : targetNode.parentElement;
    const startEl = targetEl.closest('.CodeMirror-line');
    let offset = 0;

    const treeWalker = document.createTreeWalker(
        startEl,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );

    while (treeWalker.nextNode()) {
        const node = treeWalker.currentNode;

        if (node === targetNode) {
            /* We reached the node. We're done. */
            break;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            offset += (node as Text).data.length;
        }
    }

    return offset;
}


/**
 * Find the line and character offsets for both ends of a range.
 *
 * Version Added:
 *     1.0
 *
 * Args:
 *     state (SpeakAndSpellState):
 *         The current plugin state.
 *
 *     range (StaticRange):
 *         The range to check.
 *
 * Returns:
 *     number[]:
 *     A 2-tuple of:
 *
 *     Tuple:
 *         0 (CodeMirror.Position):
 *             The offsets at the start of the range.
 *
 *         1 (CodeMirror.Position):
 *             The offsets at the end of the range.
 */
export function findOffsetsForRange(
    state: SpeakAndSpellState,
    range: StaticRange,
): [Position, Position] {
    const inputEl = state.inputEl;

    /*
     * First, pull out the nodes and the nearest elements from the ranges.
     *
     * The nodes may be text nodes, in which case we'll need their parent
     * for document traversal.
     */
    const startNode = range.startContainer;
    const endNode = range.endContainer;

    const startEl = (
        (startNode.nodeType === Node.ELEMENT_NODE)
        ? startNode as HTMLElement
        : startNode.parentElement);
    const endEl = (
        (endNode.nodeType === Node.ELEMENT_NODE)
        ? endNode as HTMLElement
        : endNode.parentElement);

    /*
     * Begin tracking the state we'll want to return or use in future
     * computations.
     *
     * In the optimal case, we'll be calculating some of this only once
     * and then reusing it.
     */
    let startLineNum = null;
    let endLineNum = null;
    let startOffsetBase = null;
    let startOffsetExtra = null;
    let endOffsetBase = null;
    let endOffsetExtra = null;

    let startCMLineEl: HTMLElement = null;
    let endCMLineEl: HTMLElement = null;

    /*
     * For both ends of the range, we'll need to first see if we're at the
     * top input element.
     *
     * If so, range offsets will be line-based rather than character-based.
     *
     * Otherwise, we'll need to find the nearest line and count characters
     * until we reach our node.
     */
    if (startEl === inputEl) {
        startLineNum = range.startOffset;
    } else {
        startCMLineEl = startEl.closest('.CodeMirror-line');
        startOffsetBase = _findCharOffsetForNode(startNode);
        startOffsetExtra = range.startOffset;
    }

    if (endEl === inputEl) {
        endLineNum = range.endOffset;
    } else {
        /*
         * If we can reuse the results from calculations above, that'll save
         * us some DOM traversal operations. Otherwise, fall back to doing the
         * same logic we did above.
         */
        endCMLineEl =
            (range.endContainer === range.startContainer &&
             startCMLineEl !== null)
            ? startCMLineEl
            : endEl.closest('.CodeMirror-line');

        endOffsetBase =
            (startEl === endEl && startOffsetBase !== null)
            ? startOffsetBase
            : _findCharOffsetForNode(endNode);
        endOffsetExtra = range.endOffset;
    }

    if (startLineNum === null || endLineNum === null) {
        /*
         * We need to find the line numbers that correspond to either missing
         * end of our range. To do this, we have to walk the lines until we
         * find both our missing line numbers.
         */
        const children = inputEl.children;

        for (let i = 0;
             (i < children.length &&
              (startLineNum === null || endLineNum === null));
             i++) {
            const child = children[i];

            if (startLineNum === null && child === startCMLineEl) {
                startLineNum = i;
            }

            if (endLineNum === null && child === endCMLineEl) {
                endLineNum = i;
            }
        }
    }

    /*
     * Return our results.
     *
     * We may not have set some of the offsets above, depending on whether
     * we were working off of the CodeMirror input element, a text node, or
     * another parent element. And we didn't want to set them any earlier,
     * because we were checking to see what we computed and what we could
     * reuse.
     *
     * At this point, anything we didn't calculate should be 0.
     */
    return [
        {
            ch: (startOffsetBase || 0) + (startOffsetExtra || 0),
            line: startLineNum,
        },
        {
            ch: (endOffsetBase || 0) + (endOffsetExtra || 0),
            line: endLineNum,
        },
    ];
}
