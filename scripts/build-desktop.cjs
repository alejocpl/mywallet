/**
 * Script de compilación y empaquetado autocontenido para MyWallet (Backend + Electron).
 *
 * Usa `esbuild` para empaquetar:
 *  - `server/src/index.ts` -> `server/dist/index.js` (mantiene externo `better-sqlite3` nativo)
 *  - Copia `pdfkit/js/data/*.afm` hacia `server/dist/data` para generación de PDFs
 *  - `electron/src/main.ts` -> `electron/dist/main.js` (incluye `electron-updater`)
 *  - `electron/src/preload.ts` -> `electron/dist/preload.js` (compatible con `sandbox: true`)
 *
 * De este modo `electron-builder` nunca omite sub-dependencias transitivas de monorepo
 * (p. ej. `call-bind-apply-helpers`, `get-intrinsic`, `side-channel-*`, etc.).
 */
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const rootDir = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const onlyServer = args.has('--server') && !args.has('--electron');
const onlyElectron = args.has('--electron') && !args.has('--server');

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyPdfkitFontData(serverDistDir) {
  let pdfkitPkgPath;
  try {
    pdfkitPkgPath = require.resolve('pdfkit/package.json', {
      paths: [rootDir, path.join(rootDir, 'server')],
    });
  } catch {
    const fallback = path.join(rootDir, 'node_modules', 'pdfkit', 'package.json');
    if (fs.existsSync(fallback)) {
      pdfkitPkgPath = fallback;
    }
  }

  if (!pdfkitPkgPath) {
    throw new Error('No se encontró `pdfkit` instalado para copiar las fuentes `.afm` al bundle.');
  }

  const srcDataDir = path.join(path.dirname(pdfkitPkgPath), 'js', 'data');
  const destDataDir = path.join(serverDistDir, 'data');
  if (fs.existsSync(srcDataDir)) {
    fs.cpSync(srcDataDir, destDataDir, { recursive: true });
  }
}

async function buildServerBundle() {
  const serverDistDir = path.join(rootDir, 'server', 'dist');
  ensureCleanDir(serverDistDir);

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'server', 'src', 'index.ts')],
    outfile: path.join(serverDistDir, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    external: ['better-sqlite3'],
    logLevel: 'info',
  });

  copyPdfkitFontData(serverDistDir);
}

async function buildElectronBundles() {
  const electronDistDir = path.join(rootDir, 'electron', 'dist');
  ensureCleanDir(electronDistDir);

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'electron', 'src', 'main.ts')],
    outfile: path.join(electronDistDir, 'main.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    external: ['electron'],
    logLevel: 'info',
  });

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'electron', 'src', 'preload.ts')],
    outfile: path.join(electronDistDir, 'preload.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    external: ['electron'],
    logLevel: 'info',
  });
}

async function main() {
  if (!onlyElectron) {
    await buildServerBundle();
  }
  if (!onlyServer) {
    await buildElectronBundles();
  }
  console.log('✅ Bundles autocontenidos compilados correctamente.');
}

main().catch((err) => {
  console.error('❌ Error al compilar bundles de escritorio:', err);
  process.exit(1);
});
