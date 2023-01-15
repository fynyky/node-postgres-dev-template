// Have bundle each source js file into an output file with node modules included
import glob from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeResolve } from '@rollup/plugin-node-resolve';
export default {
  input: Object.fromEntries(
    glob.sync('src/js/*.js').map(file => [
      // This remove `src/js` as well as the file extension from each file, so e.g.
      // src/js/foo.js becomes src/public/foo
      path.relative('src/js', file.slice(0, file.length - path.extname(file).length)),
      // This expands the relative paths to absolute paths, so e.g.
      // src/public/foo becomes /project/src/public/foo.js
      fileURLToPath(new URL(file, import.meta.url))
    ])
  ),
  output: {
    dir: 'src/public'
  },
  plugins: [nodeResolve()]
};