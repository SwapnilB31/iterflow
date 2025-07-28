const esbuild = require('esbuild');
const path = require('path');

const entry = path.resolve(__dirname, 'src/index.ts');
const outdir = path.resolve(__dirname, 'dist');

// Build ES Module
esbuild.build({
  entryPoints: [entry],
  outdir,
  bundle: true,
  format: 'esm',
  sourcemap: true,
  minify: false,
  outExtension: { '.js': '.mjs' },
  platform: 'node',
  target: ['es2020'],
  tsconfig: path.resolve(__dirname, 'tsconfig.json'),
}).catch(() => process.exit(1));

// Build CommonJS
esbuild.build({
  entryPoints: [entry],
  outdir,
  bundle: true,
  format: 'cjs',
  sourcemap: true,
  minify: false,
  outExtension: { '.js': '.cjs' },
  platform: 'node',
  target: ['es2020'],
  tsconfig: path.resolve(__dirname, 'tsconfig.json'),
}).catch(() => process.exit(1));
