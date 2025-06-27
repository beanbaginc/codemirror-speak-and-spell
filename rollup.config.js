import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

import { version } from './package.json';


const pkgName = 'beanbag-codemirror-speak-and-spell';
const cmBuilds = ['cm5'];

const extensions = ['.ts'];
const globalsMap = {
    'codemirror': 'CodeMirror',
};



export default cmBuilds.map(cmBuild => ({
    external: [
        'codemirror',
    ],
    input: `./src/${cmBuild}/index.ts`,
    output: [
        {
            esModule: false,
            exports: 'named',
            dir: `lib/${cmBuild}`,
            format: 'umd',
            globals: globalsMap,
            name: 'SpeakAndSpell',
            sourcemap: true,
        },
        {
            dir: `lib/${cmBuild}/esm`,
            exports: 'named',
            format: 'esm',
            globals: globalsMap,
            sourcemap: true,
        },
        {
            dir: `lib/${cmBuild}/cjs`,
            exports: 'named',
            format: 'cjs',
            globals: globalsMap,
            sourcemap: true,
        },
        {
            file: `build/${pkgName}-${cmBuild}-${version}.js`,
            format: 'umd',
            globals: globalsMap,
            sourcemap: 'inline',
        },
        {
            file: `build/${pkgName}-${cmBuild}-${version}.min.js`,
            format: 'umd',
            globals: globalsMap,
            sourcemap: 'inline',
            plugins: [
                terser(),
            ],
        },
    ],
    plugins: [
        babel({
            extensions: extensions,
        }),
        resolve({
            extensions: extensions,
            modulePaths: [],
        }),
    ],
}));
