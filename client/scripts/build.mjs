import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { rmSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'dist');
const entryPoint = path.join(projectRoot, 'src', 'main.tsx');

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

await fs.mkdir(outDir, { recursive: true });

const viteApiUrl = process.env.VITE_API_URL ?? 'http://localhost:8787';

const buildResult = await build({
  entryPoints: [entryPoint],
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: outDir,
  metafile: true,
  sourcemap: true,
  minify: true,
  target: ['es2020'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  logLevel: 'info',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  entryNames: 'assets/[name]-[hash]',
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"production"',
    'import.meta.env.BASE_URL': '"/"',
    'import.meta.env.PROD': 'true',
    'import.meta.env.DEV': 'false',
    'import.meta.env.SSR': 'false',
    'import.meta.env.VITE_API_URL': JSON.stringify(viteApiUrl)
  },
  loader: {
    '.css': 'css',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
    '.webp': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.mp3': 'file',
    '.ogg': 'file'
  }
});

const entryOutput = Object.entries(buildResult.metafile.outputs).find(([, output]) => {
  return output.entryPoint && path.resolve(projectRoot, output.entryPoint) === entryPoint;
});

if (!entryOutput) {
  throw new Error('Unable to locate bundled entry file for index.html rewrite');
}

const [entryFile] = entryOutput;
const normalizedEntry = entryFile
  .replace(/^\.\//, '')
  .replace(/^dist[\\/]/, '')
  .replace(/\\/g, '/');

const indexHtmlPath = path.join(projectRoot, 'index.html');
const indexHtml = await fs.readFile(indexHtmlPath, 'utf8');
const rewrittenHtml = indexHtml.replace('/src/main.tsx', `./${normalizedEntry}`);
await fs.writeFile(path.join(outDir, 'index.html'), rewrittenHtml, 'utf8');

const publicAssets = path.join(projectRoot, 'assets');
if (existsSync(publicAssets)) {
  await fs.cp(publicAssets, path.join(outDir, 'assets'), { recursive: true });
}

const rootAssets = ['cart-template.webp'];
await Promise.all(
  rootAssets.map(async (asset) => {
    const assetPath = path.join(projectRoot, asset);
    if (existsSync(assetPath)) {
      await fs.copyFile(assetPath, path.join(outDir, asset));
    }
  })
);

console.log('Build completed using esbuild.');

