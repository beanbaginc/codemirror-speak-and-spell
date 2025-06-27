(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('codemirror')) :
    typeof define === 'function' && define.amd ? define(['codemirror'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CodeMirror));
})(this, (function (CodeMirror) { 'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var CodeMirror__namespace = /*#__PURE__*/_interopNamespace(CodeMirror);

    /**
     * CodeMirror utility functions.
     *
     * Version Added:
     *     1.0
     */

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
    function _findCharOffsetForNode(targetNode) {
      const targetEl = targetNode.nodeType === Node.ELEMENT_NODE ? targetNode : targetNode.parentElement;
      const startEl = targetEl.closest('.CodeMirror-line');
      let offset = 0;
      const treeWalker = document.createTreeWalker(startEl, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      while (treeWalker.nextNode()) {
        const node = treeWalker.currentNode;
        if (node === targetNode) {
          /* We reached the node. We're done. */
          break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          offset += node.data.length;
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
    function findOffsetsForRange(state, range) {
      const inputEl = state.inputEl;

      /*
       * First, pull out the nodes and the nearest elements from the ranges.
       *
       * The nodes may be text nodes, in which case we'll need their parent
       * for document traversal.
       */
      const startNode = range.startContainer;
      const endNode = range.endContainer;
      const startEl = startNode.nodeType === Node.ELEMENT_NODE ? startNode : startNode.parentElement;
      const endEl = endNode.nodeType === Node.ELEMENT_NODE ? endNode : endNode.parentElement;

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
      let startCMLineEl = null;
      let endCMLineEl = null;

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
        endCMLineEl = range.endContainer === range.startContainer && startCMLineEl !== null ? startCMLineEl : endEl.closest('.CodeMirror-line');
        endOffsetBase = startEl === endEl && startOffsetBase !== null ? startOffsetBase : _findCharOffsetForNode(endNode);
        endOffsetExtra = range.endOffset;
      }
      if (startLineNum === null || endLineNum === null) {
        /*
         * We need to find the line numbers that correspond to either missing
         * end of our range. To do this, we have to walk the lines until we
         * find both our missing line numbers.
         */
        const children = inputEl.children;
        for (let i = 0; i < children.length && (startLineNum === null || endLineNum === null); i++) {
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
      return [{
        ch: (startOffsetBase || 0) + (startOffsetExtra || 0),
        line: startLineNum
      }, {
        ch: (endOffsetBase || 0) + (endOffsetExtra || 0),
        line: endLineNum
      }];
    }

    /**
     * Event handling for the plugin.
     *
     * Version Added:
     *     1.0
     */
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
    function onBeforeInput(state, evt) {
      var _evt$dataTransfer;
      if (evt.inputType !== 'insertReplacementText' && evt.inputType !== 'insertText') {
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
      const newText = evt.data ?? ((_evt$dataTransfer = evt.dataTransfer) === null || _evt$dataTransfer === void 0 ? void 0 : _evt$dataTransfer.getData('text')) ?? null;
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

    /**
     * State management for the Speak-and-Spell plugin.
     *
     * Version Added:
     *     1.0
     */

    /**
     * State for the plugin.
     *
     * Version Added:
     *     1.0
     */

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
    function setupSpeakAndSpellState(cm, onBeforeInput) {
      const inputEl = cm.display.input.div;
      const handler = evt => onBeforeInput(state, evt);
      inputEl.addEventListener('beforeinput', handler);
      const state = {
        cm: cm,
        inputEl: inputEl,
        beforeInputHandler: handler
      };
      cm._speakAndSpellState = state;
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
    function clearSpeakAndSpellState(cm) {
      const state = cm._speakAndSpellState || null;
      if (state) {
        state.inputEl.removeEventListener('beforeinput', state.beforeInputHandler);
        cm._speakAndSpellState = null;
      }
    }

    /**
     * Main setup for the Speak-and-Spell plugin.
     *
     * Version Added:
     *     1.0
     */

    /*
     * Register the plugin. It'll activate when using ``speakAndSpell: true``.
     */
    CodeMirror__namespace.defineOption('speakAndSpell', false, function (cm, enabled, oldEnabled) {
      if (oldEnabled && oldEnabled !== CodeMirror__namespace.Init) {
        clearSpeakAndSpellState(cm);
      }
      if (enabled) {
        setupSpeakAndSpellState(cm, onBeforeInput);
      }
    });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVhbmJhZy1jb2RlbWlycm9yLXNwZWFrLWFuZC1zcGVsbC1jbTUtMS4wLjAuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jbTUvY21VdGlscy50cyIsIi4uL3NyYy9jbTUvZXZlbnRzLnRzIiwiLi4vc3JjL2NtNS9zdGF0ZS50cyIsIi4uL3NyYy9jbTUvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb2RlTWlycm9yIHV0aWxpdHkgZnVuY3Rpb25zLlxuICpcbiAqIFZlcnNpb24gQWRkZWQ6XG4gKiAgICAgMS4wXG4gKi9cblxuaW1wb3J0IHsgdHlwZSBQb3NpdGlvbiB9IGZyb20gJ2NvZGVtaXJyb3InO1xuaW1wb3J0IHsgdHlwZSBTcGVha0FuZFNwZWxsU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuXG4vKipcbiAqIEZpbmQgdGhlIGNoYXJhY3RlciBvZmZzZXQgd2l0aGluIGEgbGluZSB0byB0aGUgc3RhcnQgb2YgYSBub2RlLlxuICpcbiAqIFRoaXMgd2Fsa3MgZnJvbSB0aGUgc3RhcnQgb2YgdGhlIENvZGVNaXJvciBsaW5lIGVsZW1lbnQgdG8gdGhlIHByb3ZpZGVkXG4gKiBub2RlLCBjb3VudGluZyB0aGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgYmVmb3JlIHRoZSBub2RlLlxuICpcbiAqIFRoZSBub2RlIG1heSBiZSBhIHRleHQgbm9kZSBvciBhbiBlbGVtZW50LiBJdCBtdXN0IGxpdmUgd2l0aGluIGFcbiAqIGBgLkNvZGVNaXJyb3ItbGluZWBgIGVsZW1lbnQsIGJ1dCBkb2VzIG5vdCBuZWVkIHRvIGJlIGFuIGltbWVkaWF0ZVxuICogZGVzY2VuZGFudC5cbiAqXG4gKiBWZXJzaW9uIEFkZGVkOlxuICogICAgIDEuMFxuICpcbiAqIEFyZ3M6XG4gKiAgICAgdGFyZ2V0Tm9kZSAoTm9kZSk6XG4gKiAgICAgICAgIFRoZSB0YXJnZXQgbm9kZSB3aXRoaW4gYSBsaW5lLlxuICpcbiAqIFJldHVybnM6XG4gKiAgICAgbnVtYmVyOlxuICogICAgIFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBwcmVjZWRpbmcgdGhlIG5vZGUuXG4gKi9cbmZ1bmN0aW9uIF9maW5kQ2hhck9mZnNldEZvck5vZGUoXG4gICAgdGFyZ2V0Tm9kZTogTm9kZSxcbik6IG51bWJlciB7XG4gICAgY29uc3QgdGFyZ2V0RWwgPSAodGFyZ2V0Tm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpXG4gICAgICAgICAgICAgICAgICAgICAgPyB0YXJnZXROb2RlIGFzIEhUTUxFbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgOiB0YXJnZXROb2RlLnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3Qgc3RhcnRFbCA9IHRhcmdldEVsLmNsb3Nlc3QoJy5Db2RlTWlycm9yLWxpbmUnKTtcbiAgICBsZXQgb2Zmc2V0ID0gMDtcblxuICAgIGNvbnN0IHRyZWVXYWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKFxuICAgICAgICBzdGFydEVsLFxuICAgICAgICBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCB8IE5vZGVGaWx0ZXIuU0hPV19URVhULFxuICAgICk7XG5cbiAgICB3aGlsZSAodHJlZVdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0cmVlV2Fsa2VyLmN1cnJlbnROb2RlO1xuXG4gICAgICAgIGlmIChub2RlID09PSB0YXJnZXROb2RlKSB7XG4gICAgICAgICAgICAvKiBXZSByZWFjaGVkIHRoZSBub2RlLiBXZSdyZSBkb25lLiAqL1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgICAgICAgIG9mZnNldCArPSAobm9kZSBhcyBUZXh0KS5kYXRhLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvZmZzZXQ7XG59XG5cblxuLyoqXG4gKiBGaW5kIHRoZSBsaW5lIGFuZCBjaGFyYWN0ZXIgb2Zmc2V0cyBmb3IgYm90aCBlbmRzIG9mIGEgcmFuZ2UuXG4gKlxuICogVmVyc2lvbiBBZGRlZDpcbiAqICAgICAxLjBcbiAqXG4gKiBBcmdzOlxuICogICAgIHN0YXRlIChTcGVha0FuZFNwZWxsU3RhdGUpOlxuICogICAgICAgICBUaGUgY3VycmVudCBwbHVnaW4gc3RhdGUuXG4gKlxuICogICAgIHJhbmdlIChTdGF0aWNSYW5nZSk6XG4gKiAgICAgICAgIFRoZSByYW5nZSB0byBjaGVjay5cbiAqXG4gKiBSZXR1cm5zOlxuICogICAgIG51bWJlcltdOlxuICogICAgIEEgMi10dXBsZSBvZjpcbiAqXG4gKiAgICAgVHVwbGU6XG4gKiAgICAgICAgIDAgKENvZGVNaXJyb3IuUG9zaXRpb24pOlxuICogICAgICAgICAgICAgVGhlIG9mZnNldHMgYXQgdGhlIHN0YXJ0IG9mIHRoZSByYW5nZS5cbiAqXG4gKiAgICAgICAgIDEgKENvZGVNaXJyb3IuUG9zaXRpb24pOlxuICogICAgICAgICAgICAgVGhlIG9mZnNldHMgYXQgdGhlIGVuZCBvZiB0aGUgcmFuZ2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kT2Zmc2V0c0ZvclJhbmdlKFxuICAgIHN0YXRlOiBTcGVha0FuZFNwZWxsU3RhdGUsXG4gICAgcmFuZ2U6IFN0YXRpY1JhbmdlLFxuKTogW1Bvc2l0aW9uLCBQb3NpdGlvbl0ge1xuICAgIGNvbnN0IGlucHV0RWwgPSBzdGF0ZS5pbnB1dEVsO1xuXG4gICAgLypcbiAgICAgKiBGaXJzdCwgcHVsbCBvdXQgdGhlIG5vZGVzIGFuZCB0aGUgbmVhcmVzdCBlbGVtZW50cyBmcm9tIHRoZSByYW5nZXMuXG4gICAgICpcbiAgICAgKiBUaGUgbm9kZXMgbWF5IGJlIHRleHQgbm9kZXMsIGluIHdoaWNoIGNhc2Ugd2UnbGwgbmVlZCB0aGVpciBwYXJlbnRcbiAgICAgKiBmb3IgZG9jdW1lbnQgdHJhdmVyc2FsLlxuICAgICAqL1xuICAgIGNvbnN0IHN0YXJ0Tm9kZSA9IHJhbmdlLnN0YXJ0Q29udGFpbmVyO1xuICAgIGNvbnN0IGVuZE5vZGUgPSByYW5nZS5lbmRDb250YWluZXI7XG5cbiAgICBjb25zdCBzdGFydEVsID0gKFxuICAgICAgICAoc3RhcnROb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSlcbiAgICAgICAgPyBzdGFydE5vZGUgYXMgSFRNTEVsZW1lbnRcbiAgICAgICAgOiBzdGFydE5vZGUucGFyZW50RWxlbWVudCk7XG4gICAgY29uc3QgZW5kRWwgPSAoXG4gICAgICAgIChlbmROb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSlcbiAgICAgICAgPyBlbmROb2RlIGFzIEhUTUxFbGVtZW50XG4gICAgICAgIDogZW5kTm9kZS5wYXJlbnRFbGVtZW50KTtcblxuICAgIC8qXG4gICAgICogQmVnaW4gdHJhY2tpbmcgdGhlIHN0YXRlIHdlJ2xsIHdhbnQgdG8gcmV0dXJuIG9yIHVzZSBpbiBmdXR1cmVcbiAgICAgKiBjb21wdXRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBJbiB0aGUgb3B0aW1hbCBjYXNlLCB3ZSdsbCBiZSBjYWxjdWxhdGluZyBzb21lIG9mIHRoaXMgb25seSBvbmNlXG4gICAgICogYW5kIHRoZW4gcmV1c2luZyBpdC5cbiAgICAgKi9cbiAgICBsZXQgc3RhcnRMaW5lTnVtID0gbnVsbDtcbiAgICBsZXQgZW5kTGluZU51bSA9IG51bGw7XG4gICAgbGV0IHN0YXJ0T2Zmc2V0QmFzZSA9IG51bGw7XG4gICAgbGV0IHN0YXJ0T2Zmc2V0RXh0cmEgPSBudWxsO1xuICAgIGxldCBlbmRPZmZzZXRCYXNlID0gbnVsbDtcbiAgICBsZXQgZW5kT2Zmc2V0RXh0cmEgPSBudWxsO1xuXG4gICAgbGV0IHN0YXJ0Q01MaW5lRWw6IEhUTUxFbGVtZW50ID0gbnVsbDtcbiAgICBsZXQgZW5kQ01MaW5lRWw6IEhUTUxFbGVtZW50ID0gbnVsbDtcblxuICAgIC8qXG4gICAgICogRm9yIGJvdGggZW5kcyBvZiB0aGUgcmFuZ2UsIHdlJ2xsIG5lZWQgdG8gZmlyc3Qgc2VlIGlmIHdlJ3JlIGF0IHRoZVxuICAgICAqIHRvcCBpbnB1dCBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgc28sIHJhbmdlIG9mZnNldHMgd2lsbCBiZSBsaW5lLWJhc2VkIHJhdGhlciB0aGFuIGNoYXJhY3Rlci1iYXNlZC5cbiAgICAgKlxuICAgICAqIE90aGVyd2lzZSwgd2UnbGwgbmVlZCB0byBmaW5kIHRoZSBuZWFyZXN0IGxpbmUgYW5kIGNvdW50IGNoYXJhY3RlcnNcbiAgICAgKiB1bnRpbCB3ZSByZWFjaCBvdXIgbm9kZS5cbiAgICAgKi9cbiAgICBpZiAoc3RhcnRFbCA9PT0gaW5wdXRFbCkge1xuICAgICAgICBzdGFydExpbmVOdW0gPSByYW5nZS5zdGFydE9mZnNldDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdGFydENNTGluZUVsID0gc3RhcnRFbC5jbG9zZXN0KCcuQ29kZU1pcnJvci1saW5lJyk7XG4gICAgICAgIHN0YXJ0T2Zmc2V0QmFzZSA9IF9maW5kQ2hhck9mZnNldEZvck5vZGUoc3RhcnROb2RlKTtcbiAgICAgICAgc3RhcnRPZmZzZXRFeHRyYSA9IHJhbmdlLnN0YXJ0T2Zmc2V0O1xuICAgIH1cblxuICAgIGlmIChlbmRFbCA9PT0gaW5wdXRFbCkge1xuICAgICAgICBlbmRMaW5lTnVtID0gcmFuZ2UuZW5kT2Zmc2V0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIElmIHdlIGNhbiByZXVzZSB0aGUgcmVzdWx0cyBmcm9tIGNhbGN1bGF0aW9ucyBhYm92ZSwgdGhhdCdsbCBzYXZlXG4gICAgICAgICAqIHVzIHNvbWUgRE9NIHRyYXZlcnNhbCBvcGVyYXRpb25zLiBPdGhlcndpc2UsIGZhbGwgYmFjayB0byBkb2luZyB0aGVcbiAgICAgICAgICogc2FtZSBsb2dpYyB3ZSBkaWQgYWJvdmUuXG4gICAgICAgICAqL1xuICAgICAgICBlbmRDTUxpbmVFbCA9XG4gICAgICAgICAgICAocmFuZ2UuZW5kQ29udGFpbmVyID09PSByYW5nZS5zdGFydENvbnRhaW5lciAmJlxuICAgICAgICAgICAgIHN0YXJ0Q01MaW5lRWwgIT09IG51bGwpXG4gICAgICAgICAgICA/IHN0YXJ0Q01MaW5lRWxcbiAgICAgICAgICAgIDogZW5kRWwuY2xvc2VzdCgnLkNvZGVNaXJyb3ItbGluZScpO1xuXG4gICAgICAgIGVuZE9mZnNldEJhc2UgPVxuICAgICAgICAgICAgKHN0YXJ0RWwgPT09IGVuZEVsICYmIHN0YXJ0T2Zmc2V0QmFzZSAhPT0gbnVsbClcbiAgICAgICAgICAgID8gc3RhcnRPZmZzZXRCYXNlXG4gICAgICAgICAgICA6IF9maW5kQ2hhck9mZnNldEZvck5vZGUoZW5kTm9kZSk7XG4gICAgICAgIGVuZE9mZnNldEV4dHJhID0gcmFuZ2UuZW5kT2Zmc2V0O1xuICAgIH1cblxuICAgIGlmIChzdGFydExpbmVOdW0gPT09IG51bGwgfHwgZW5kTGluZU51bSA9PT0gbnVsbCkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBXZSBuZWVkIHRvIGZpbmQgdGhlIGxpbmUgbnVtYmVycyB0aGF0IGNvcnJlc3BvbmQgdG8gZWl0aGVyIG1pc3NpbmdcbiAgICAgICAgICogZW5kIG9mIG91ciByYW5nZS4gVG8gZG8gdGhpcywgd2UgaGF2ZSB0byB3YWxrIHRoZSBsaW5lcyB1bnRpbCB3ZVxuICAgICAgICAgKiBmaW5kIGJvdGggb3VyIG1pc3NpbmcgbGluZSBudW1iZXJzLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBpbnB1dEVsLmNoaWxkcmVuO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwO1xuICAgICAgICAgICAgIChpIDwgY2hpbGRyZW4ubGVuZ3RoICYmXG4gICAgICAgICAgICAgIChzdGFydExpbmVOdW0gPT09IG51bGwgfHwgZW5kTGluZU51bSA9PT0gbnVsbCkpO1xuICAgICAgICAgICAgIGkrKykge1xuICAgICAgICAgICAgY29uc3QgY2hpbGQgPSBjaGlsZHJlbltpXTtcblxuICAgICAgICAgICAgaWYgKHN0YXJ0TGluZU51bSA9PT0gbnVsbCAmJiBjaGlsZCA9PT0gc3RhcnRDTUxpbmVFbCkge1xuICAgICAgICAgICAgICAgIHN0YXJ0TGluZU51bSA9IGk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChlbmRMaW5lTnVtID09PSBudWxsICYmIGNoaWxkID09PSBlbmRDTUxpbmVFbCkge1xuICAgICAgICAgICAgICAgIGVuZExpbmVOdW0gPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBSZXR1cm4gb3VyIHJlc3VsdHMuXG4gICAgICpcbiAgICAgKiBXZSBtYXkgbm90IGhhdmUgc2V0IHNvbWUgb2YgdGhlIG9mZnNldHMgYWJvdmUsIGRlcGVuZGluZyBvbiB3aGV0aGVyXG4gICAgICogd2Ugd2VyZSB3b3JraW5nIG9mZiBvZiB0aGUgQ29kZU1pcnJvciBpbnB1dCBlbGVtZW50LCBhIHRleHQgbm9kZSwgb3JcbiAgICAgKiBhbm90aGVyIHBhcmVudCBlbGVtZW50LiBBbmQgd2UgZGlkbid0IHdhbnQgdG8gc2V0IHRoZW0gYW55IGVhcmxpZXIsXG4gICAgICogYmVjYXVzZSB3ZSB3ZXJlIGNoZWNraW5nIHRvIHNlZSB3aGF0IHdlIGNvbXB1dGVkIGFuZCB3aGF0IHdlIGNvdWxkXG4gICAgICogcmV1c2UuXG4gICAgICpcbiAgICAgKiBBdCB0aGlzIHBvaW50LCBhbnl0aGluZyB3ZSBkaWRuJ3QgY2FsY3VsYXRlIHNob3VsZCBiZSAwLlxuICAgICAqL1xuICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoOiAoc3RhcnRPZmZzZXRCYXNlIHx8IDApICsgKHN0YXJ0T2Zmc2V0RXh0cmEgfHwgMCksXG4gICAgICAgICAgICBsaW5lOiBzdGFydExpbmVOdW0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoOiAoZW5kT2Zmc2V0QmFzZSB8fCAwKSArIChlbmRPZmZzZXRFeHRyYSB8fCAwKSxcbiAgICAgICAgICAgIGxpbmU6IGVuZExpbmVOdW0sXG4gICAgICAgIH0sXG4gICAgXTtcbn1cbiIsIi8qKlxuICogRXZlbnQgaGFuZGxpbmcgZm9yIHRoZSBwbHVnaW4uXG4gKlxuICogVmVyc2lvbiBBZGRlZDpcbiAqICAgICAxLjBcbiAqL1xuXG5pbXBvcnQgdHlwZSAqIGFzIENvZGVNaXJyb3IgZnJvbSAnY29kZW1pcnJvcic7XG5cbmltcG9ydCB7IGZpbmRPZmZzZXRzRm9yUmFuZ2UgfSBmcm9tICcuL2NtVXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBTcGVha0FuZFNwZWxsU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuXG4vKipcbiAqIEhhbmRsZSBiZWZvcmVpbnB1dCBldmVudHMgb24gdGhlIENvZGVNaXJyb3IgaW5wdXQgZWxlbWVudC5cbiAqXG4gKiBUaGlzIHdpbGwgbGlzdGVuIGZvciBldmVudHMgdGhhdCBjb3JyZXNwb25kIHRvIHRleHQgaW5zZXJ0cyBvclxuICogcmVwbGFjZW1lbnRzLCB3aGljaCB3b3VsZCBiZSBzZW50IGJ5IHNwZWxsIGNoZWNraW5nIGNvcnJlY3Rpb25zLFxuICogc3BlZWNoLXRvLXRleHQsIG9yIG90aGVyIGZvcm1zIG9mIHRleHQgZ2VuZXJhdGlvbiBvciBtYW5pcHVsYXRpb24uXG4gKlxuICogQmFzZWQgb24gdGhlIGV2ZW50LCB0aGlzIG1heSBjYW5jZWwgdGhlIGRlZmF1bHQgYnJvd3NlciBiZWhhdmlvciBhbmRcbiAqIGluaXRpYXRlIHRoZSBvcGVyYXRpb24gZGlyZWN0bHkgaW4gQ29kZU1pcnJvci5cbiAqXG4gKiBWZXJzaW9uIEFkZGVkOlxuICogICAgIDEuMFxuICpcbiAqIEFyZ3M6XG4gKiAgICAgc3RhdGUgKFNwZWFrQW5kU3BlbGxTdGF0ZSk6XG4gKiAgICAgICAgIFRoZSBjdXJyZW50IHBsdWdpbiBzdGF0ZS5cbiAqXG4gKiAgICAgZXZ0IChJbnB1dEV2ZW50KTpcbiAqICAgICAgICAgVGhlIGlucHV0IGV2ZW50IHRvIHByb2Nlc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbkJlZm9yZUlucHV0KFxuICAgIHN0YXRlOiBTcGVha0FuZFNwZWxsU3RhdGUsXG4gICAgZXZ0OiBJbnB1dEV2ZW50LFxuKSB7XG4gICAgaWYgKGV2dC5pbnB1dFR5cGUgIT09ICdpbnNlcnRSZXBsYWNlbWVudFRleHQnICYmXG4gICAgICAgIGV2dC5pbnB1dFR5cGUgIT09ICdpbnNlcnRUZXh0Jykge1xuICAgICAgICAvKlxuICAgICAgICAgKiBXZSBvbmx5IHdhbnQgdG8gaGFuZGxlIHJlcGxhY2VtZW50cyB0byB0aGUgdGV4dCBvciBuZXdcbiAgICAgICAgICogaW5zZXJ0cy4gSWdub3JlIHRoaXMuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBUaGlzIG1heSBiZSBhIHNwZWxsIGNoZWNraW5nIHJlcGxhY2VtZW50LCBhdXRvLWNvcnJlY3QgKGlmIGl0IHdlcmVcbiAgICAgKiBlbmFibGVkKSwgd3JpdGluZyBzdWdnZXN0aW9uLCBvciBzaW1pbGFyLlxuICAgICAqXG4gICAgICogSWYgd2UgaGF2ZSB0aGUgc3RhdGUgd2UgZXhwZWN0LCB3ZSdsbCBza2lwIHRoZSBicm93c2VyJ3MgZGVmYXVsdFxuICAgICAqIGJlaGF2aW9yIGFuZCB1c2UgQ29kZU1pcnJvciB0byByZXBsYWNlIHRoZSBzdHJpbmcsIHNvIGl0IGRvZXNuJ3RcbiAgICAgKiBoYXZlIHRvIGZpZ2h0IHRoZSBET00uXG4gICAgICpcbiAgICAgKiBGaXJzdCwgZ3JhYiB0aGUgcmFuZ2VzIGZyb20gdGhlIGV2ZW50LiBUaGlzIG1pZ2h0IGJlIGVtcHR5LCB3aGljaFxuICAgICAqIHdvdWxkIGhhdmUgYmVlbiB0aGUgY2FzZSBvbiBzb21lIHZlcnNpb25zIG9mIENocm9tZSBJIHRlc3RlZCB3aXRoXG4gICAgICogYmVmb3JlLiAgUGxheSBpdCBzYWZlLCBiYWlsIGlmIHdlIGNhbid0IGZpbmQgYSByYW5nZS5cbiAgICAgKlxuICAgICAqIEVhY2ggcmFuZ2Ugd2lsbCBoYXZlIGFuIG9mZnNldCBpbiBhIHN0YXJ0IGNvbnRhaW5lciBhbmQgYW4gb2Zmc2V0XG4gICAgICogaW4gYW4gZW5kIGNvbnRhaW5lci4gVGhlc2UgY29udGFpbmVycyBtYXkgYmUgdGV4dCBub2RlcyBvciBzb21lXG4gICAgICogcGFyZW50IG5vZGUgKHVwIHRvIGFuZCBpbmNsdWRpbmcgdGhlIGNvbnRlbnRlZGl0YWJsZSBub2RlKS5cbiAgICAgKi9cbiAgICBjb25zdCByYW5nZXMgPSBldnQuZ2V0VGFyZ2V0UmFuZ2VzKCk7XG5cbiAgICBpZiAoIXJhbmdlcyB8fCByYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8qIFdlIGdvdCBlbXB0eSByYW5nZXMuIFRoZXJlJ3Mgbm90aGluZyB0byBkby4gKi9cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld1RleHQgPSBldnQuZGF0YSA/PyBldnQuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0JykgPz8gbnVsbDtcblxuICAgIGlmIChuZXdUZXh0ID09PSBudWxsKSB7XG4gICAgICAgIC8qIFdlIGNvdWxkbid0IHJldHJpZXZlIHRoZSB0ZXh0LiBUaGVyZSdzIG5vdGhpbmcgdG8gZG8uICovXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIFdlJ2xsIHRha2Ugb3ZlciBmcm9tIGhlcmUuIFdlIGRvbid0IHdhbnQgdGhlIGJyb3dzZXIgbWVzc2luZyB3aXRoXG4gICAgICogYW55IHN0YXRlIGFuZCBpbXBhY3RpbmcgQ29kZU1pcnJvci4gSW5zdGVhZCwgd2UnbGwgcnVuIHRoZVxuICAgICAqIG9wZXJhdGlvbnMgdGhyb3VnaCBDb2RlTWlycm9yLlxuICAgICAqL1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgIGNvbnN0IGNtID0gc3RhdGUuY207XG5cbiAgICBmb3IgKGNvbnN0IHJhbmdlIG9mIHJhbmdlcykge1xuICAgICAgICBjb25zdCBbc3RhcnRPZmZzZXQsIGVuZE9mZnNldF0gPSBmaW5kT2Zmc2V0c0ZvclJhbmdlKHN0YXRlLCByYW5nZSk7XG5cbiAgICAgICAgY20ucmVwbGFjZVJhbmdlKG5ld1RleHQsIHN0YXJ0T2Zmc2V0LCBlbmRPZmZzZXQsICcraW5wdXQnKTtcbiAgICB9XG59XG4iLCIvKipcbiAqIFN0YXRlIG1hbmFnZW1lbnQgZm9yIHRoZSBTcGVhay1hbmQtU3BlbGwgcGx1Z2luLlxuICpcbiAqIFZlcnNpb24gQWRkZWQ6XG4gKiAgICAgMS4wXG4gKi9cblxuaW1wb3J0IHR5cGUgKiBhcyBDb2RlTWlycm9yIGZyb20gJ2NvZGVtaXJyb3InO1xuXG5cbi8qKlxuICogU3RhdGUgZm9yIHRoZSBwbHVnaW4uXG4gKlxuICogVmVyc2lvbiBBZGRlZDpcbiAqICAgICAxLjBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTcGVha0FuZFNwZWxsU3RhdGUge1xuICAgIC8qKiBUaGUgQ29kZU1pcnJvciBlbGVtZW50LiAqL1xuICAgIGNtOiBDb2RlTWlycm9yLkVkaXRvcjtcblxuICAgIC8qKiBUaGUgQ29kZU1pcnJvciBpbnB1dCBlbGVtZW50LiAqL1xuICAgIGlucHV0RWw6IEhUTUxFbGVtZW50O1xuXG4gICAgLyoqIFRoZSBiZWZvcmVpbnB1dCBoYW5kbGVyIG9uIHRoZSBpbnB1dCBlbGVtZW50LiAqL1xuICAgIGJlZm9yZUlucHV0SGFuZGxlcjogKGV2dDogSW5wdXRFdmVudCkgPT4gdm9pZDtcbn1cblxuXG4vKipcbiAqIFNldCB1cCBzdGF0ZSBmb3IgdGhlIHBsdWdpbi5cbiAqXG4gKiBWZXJzaW9uIEFkZGVkOlxuICogICAgIDEuMFxuICpcbiAqIEFyZ3M6XG4gKiAgICAgY20gKENvZGVNaXJyb3IuRWRpdG9yKTpcbiAqICAgICAgICAgVGhlIENvZGVNaXJyb3IgaW5zdGFuY2UuXG4gKlxuICogICAgIG9uQmVmb3JlSW5wdXQgKGZ1bmN0aW9uKTpcbiAqICAgICAgICAgVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBgYGJlZm9yZWlucHV0YGAgaXMgdHJpZ2dlcmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBTcGVha0FuZFNwZWxsU3RhdGUoXG4gICAgY206IENvZGVNaXJyb3IuRWRpdG9yLFxuICAgIG9uQmVmb3JlSW5wdXQ6IChTcGVha0FuZFNwZWxsU3RhdGUsIElucHV0RXZlbnQpID0+IHZvaWQsXG4pIHtcbiAgICBjb25zdCBpbnB1dEVsID0gKGNtIGFzIGFueSkuZGlzcGxheS5pbnB1dC5kaXY7XG5cbiAgICBjb25zdCBoYW5kbGVyID0gKGV2dDogSW5wdXRFdmVudCkgPT4gb25CZWZvcmVJbnB1dChzdGF0ZSwgZXZ0KTtcbiAgICBpbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZWlucHV0JywgaGFuZGxlcik7XG5cbiAgICBjb25zdCBzdGF0ZTogU3BlYWtBbmRTcGVsbFN0YXRlID0ge1xuICAgICAgICBjbTogY20sXG4gICAgICAgIGlucHV0RWw6IGlucHV0RWwsXG4gICAgICAgIGJlZm9yZUlucHV0SGFuZGxlcjogaGFuZGxlcixcbiAgICB9O1xuICAgIChjbSBhcyBhbnkpLl9zcGVha0FuZFNwZWxsU3RhdGUgPSBzdGF0ZTtcbn1cblxuXG4vKipcbiAqIENsZWFyIHN0YXRlIGZvciB0aGUgcGx1Z2luLlxuICpcbiAqIFZlcnNpb24gQWRkZWQ6XG4gKiAgICAgMS4wXG4gKlxuICogQXJnczpcbiAqICAgICBjbSAoQ29kZU1pcnJvci5FZGl0b3IpOlxuICogICAgICAgICBUaGUgQ29kZU1pcnJvciBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyU3BlYWtBbmRTcGVsbFN0YXRlKFxuICAgIGNtOiBDb2RlTWlycm9yLkVkaXRvcixcbikge1xuICAgIGNvbnN0IHN0YXRlID0gKGNtIGFzIGFueSkuX3NwZWFrQW5kU3BlbGxTdGF0ZSB8fCBudWxsO1xuXG4gICAgaWYgKHN0YXRlKSB7XG4gICAgICAgIHN0YXRlLmlucHV0RWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmVmb3JlaW5wdXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuYmVmb3JlSW5wdXRIYW5kbGVyKTtcbiAgICAgICAgKGNtIGFzIGFueSkuX3NwZWFrQW5kU3BlbGxTdGF0ZSA9IG51bGw7XG4gICAgfVxufVxuIiwiLyoqXG4gKiBNYWluIHNldHVwIGZvciB0aGUgU3BlYWstYW5kLVNwZWxsIHBsdWdpbi5cbiAqXG4gKiBWZXJzaW9uIEFkZGVkOlxuICogICAgIDEuMFxuICovXG5cbmltcG9ydCAqIGFzIENvZGVNaXJyb3IgZnJvbSAnY29kZW1pcnJvcic7XG5cbmltcG9ydCB7IG9uQmVmb3JlSW5wdXQgfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIGNsZWFyU3BlYWtBbmRTcGVsbFN0YXRlLFxuICAgIHNldHVwU3BlYWtBbmRTcGVsbFN0YXRlLFxufSBmcm9tICcuL3N0YXRlJztcblxuXG4vKlxuICogUmVnaXN0ZXIgdGhlIHBsdWdpbi4gSXQnbGwgYWN0aXZhdGUgd2hlbiB1c2luZyBgYHNwZWFrQW5kU3BlbGw6IHRydWVgYC5cbiAqL1xuQ29kZU1pcnJvci5kZWZpbmVPcHRpb24oJ3NwZWFrQW5kU3BlbGwnLCBmYWxzZSwgZnVuY3Rpb24oXG4gICAgY206IENvZGVNaXJyb3IuRWRpdG9yLFxuICAgIGVuYWJsZWQ6IGJvb2xlYW4sXG4gICAgb2xkRW5hYmxlZDogYm9vbGVhbixcbikge1xuICAgIGlmIChvbGRFbmFibGVkICYmIG9sZEVuYWJsZWQgIT09IChDb2RlTWlycm9yIGFzIGFueSkuSW5pdCkge1xuICAgICAgICBjbGVhclNwZWFrQW5kU3BlbGxTdGF0ZShjbSk7XG4gICAgfVxuXG4gICAgaWYgKGVuYWJsZWQpIHtcbiAgICAgICAgc2V0dXBTcGVha0FuZFNwZWxsU3RhdGUoY20sIG9uQmVmb3JlSW5wdXQpO1xuICAgIH1cbn0pO1xuIl0sIm5hbWVzIjpbIl9maW5kQ2hhck9mZnNldEZvck5vZGUiLCJ0YXJnZXROb2RlIiwidGFyZ2V0RWwiLCJub2RlVHlwZSIsIk5vZGUiLCJFTEVNRU5UX05PREUiLCJwYXJlbnRFbGVtZW50Iiwic3RhcnRFbCIsImNsb3Nlc3QiLCJvZmZzZXQiLCJ0cmVlV2Fsa2VyIiwiZG9jdW1lbnQiLCJjcmVhdGVUcmVlV2Fsa2VyIiwiTm9kZUZpbHRlciIsIlNIT1dfRUxFTUVOVCIsIlNIT1dfVEVYVCIsIm5leHROb2RlIiwibm9kZSIsImN1cnJlbnROb2RlIiwiVEVYVF9OT0RFIiwiZGF0YSIsImxlbmd0aCIsImZpbmRPZmZzZXRzRm9yUmFuZ2UiLCJzdGF0ZSIsInJhbmdlIiwiaW5wdXRFbCIsInN0YXJ0Tm9kZSIsInN0YXJ0Q29udGFpbmVyIiwiZW5kTm9kZSIsImVuZENvbnRhaW5lciIsImVuZEVsIiwic3RhcnRMaW5lTnVtIiwiZW5kTGluZU51bSIsInN0YXJ0T2Zmc2V0QmFzZSIsInN0YXJ0T2Zmc2V0RXh0cmEiLCJlbmRPZmZzZXRCYXNlIiwiZW5kT2Zmc2V0RXh0cmEiLCJzdGFydENNTGluZUVsIiwiZW5kQ01MaW5lRWwiLCJzdGFydE9mZnNldCIsImVuZE9mZnNldCIsImNoaWxkcmVuIiwiaSIsImNoaWxkIiwiY2giLCJsaW5lIiwib25CZWZvcmVJbnB1dCIsImV2dCIsIl9ldnQkZGF0YVRyYW5zZmVyIiwiaW5wdXRUeXBlIiwicmFuZ2VzIiwiZ2V0VGFyZ2V0UmFuZ2VzIiwibmV3VGV4dCIsImRhdGFUcmFuc2ZlciIsImdldERhdGEiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsImNtIiwicmVwbGFjZVJhbmdlIiwic2V0dXBTcGVha0FuZFNwZWxsU3RhdGUiLCJkaXNwbGF5IiwiaW5wdXQiLCJkaXYiLCJoYW5kbGVyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImJlZm9yZUlucHV0SGFuZGxlciIsIl9zcGVha0FuZFNwZWxsU3RhdGUiLCJjbGVhclNwZWFrQW5kU3BlbGxTdGF0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJDb2RlTWlycm9yIiwiZGVmaW5lT3B0aW9uIiwiZW5hYmxlZCIsIm9sZEVuYWJs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
