import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';


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
