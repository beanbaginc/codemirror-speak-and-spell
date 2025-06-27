# CodeMirror Speak-and-Spell

This is a plugin for CodeMirror v5 that provides more reliable support for:

* The browser's built-in spell checker
* Speech-to-text input
* Platform or browser-provided AI-assisted writing
* Text transformations

It works in cooperation with CodeMirror v5's ``inputStyle: 'contenteditable'``
and ``spellcheck: true`` settings, and avoids many of the quirks that could
sometimes appear.

It does this by intercepting the browser's attempts at performing these
text changes, blocking them and re-attempting them directly using CodeMirror's
API. This keeps CodeMirror and the browser from fighting with each other
any time text is being inserted or replaced by the browser.


## Installation and Usage

There are two ways you can use this plugin:

1. Simply download the latest script from our releases or our repository's
  `build/` directory and embed it in your page.

   For example:

   ```html
   <script src="/js/beanbag-codemirror-speak-and-spell-cm5-1.0.0.min.js"></script>
   ```

2. Alternatively, install using `npm`:

   ```shell
   $ npm install --save @beanbag/codemirror-speak-and-spell
   ```

   And then import into another module:

   ```javascript
   import { SpeakAndSpell } from '@beanbag/codemirror-speak-and-spell/cm5';
   ```

Once installed and running in your CodeMirror v5 environment, simply activate
it:

```javascript
const codeMirror = new CodeMirror(element, {
    inputStyle: 'contenteditable',
    spellcheck: true,
    speakAndSpell: true,
});
```


## License

CodeMirror Speak-and-Spell is available under the MIT license.


## Important Notes

Not all browsers implement spell checking the same way.

Firefox will check the text in your CodeMirror immediately when rendered,
but Chrome and Safari usually won't. Instead, they'll check when typing
or when interacting with a word.

This means that you won't always see misspelled words on Chrome or Safari
immediately, but this is browser behavior and not something that can be
worked around. It's also not specific to CodeMirror.

To ensure the best experience, you'll want the latest evergreen versions of
Firefox and Chrome, and the latest OS releases of Safari.


## Our Other Projects

* [Review Board](https://www.reviewboard.org) -
  Our open source, extensible code review, document review, and image review
  tool.

* [Djblets](https://github.com/djblets/djblets/) -
  Our pack of Django utilities for datagrids, API, extensions, and more. Used
  by Review Board.

* [Spina](https://github.com/beanbaginc/spina) -
  A modern Backbone-like class library, built with TypeScript and extensibility
  in mind.

* [Ink](https://github.com/beanbaginc/ink) -
  The accessible, themeable UI component library powering Review Board.

* [Housekeeping](https://github.com/beanbaginc/housekeeping) -
  Deprecation management for Python modules, classes, functions, and
  attributes.

* [kgb](https://github.com/beanbaginc/kgb) -
  A powerful function spy implementation to help write Python unit tests.

* [Typelets](https://github.com/beanbaginc/python-typelets) -
  Type hints and utility objects for Python and Django projects.

You can see more on [github.com/beanbaginc](https://github.com/beanbaginc) and
[github.com/reviewboard](https://github.com/reviewboard).
