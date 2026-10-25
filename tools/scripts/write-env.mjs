// Écrit la configuration d'exécution (env.js) dans le build d'une application, à partir de API_BASE_URL.
// Pour les hébergeurs statiques (Vercel) : l'équivalent, au build, de l'écriture au lancement du conteneur.
// Sans API_BASE_URL, le env.js de l'application (`/api`) est gardé.
//
//   node tools/scripts/write-env.mjs <dossier du build> [--csp <vercel.json>]
//
// Avec --csp : refuse une API absente du `connect-src` de la Content-Security-Policy de ce vercel.json, que le
// navigateur bloquerait sans bruit (chaque appel échouerait en production).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [outputDir, flag, cspFile] = process.argv.slice(2);
if (!outputDir || (flag && flag !== '--csp') || (flag && !cspFile)) {
  console.error('usage : node tools/scripts/write-env.mjs <dossier du build> [--csp <vercel.json>]');
  process.exit(2);
}
if (!existsSync(join(outputDir, 'index.html'))) {
  console.error(`write-env : ${outputDir} ne contient pas de build (index.html absent)`);
  process.exit(1);
}

const apiBaseUrl = process.env.API_BASE_URL?.trim();

if (cspFile) {
  const allowed = connectSources(resolve(cspFile));
  const origin = apiOrigin(apiBaseUrl);
  // API relative (`/api`) : même origine, couverte par 'self'.
  const covered = origin === null ? allowed.includes("'self'") : allowed.includes(origin);
  if (!covered) {
    console.error(`write-env : l'API ${apiBaseUrl} (${origin ?? "'self'"}) n'est pas dans connect-src de ${cspFile} (${allowed.join(' ')})`);
    process.exit(1);
  }
}

if (apiBaseUrl) {
  writeFileSync(join(outputDir, 'env.js'), `window.__env = ${JSON.stringify({ apiBaseUrl })};\n`);
  console.log(`env.js : apiBaseUrl = ${apiBaseUrl}`);
} else {
  console.log('env.js : API_BASE_URL absent, /api conservé');
}

/** Origine d'une URL absolue (`https://api.example.com`), ou null pour une URL relative. */
function apiOrigin(url) {
  if (!url || url.startsWith('/')) {
    return null;
  }
  return new URL(url).origin;
}

/** Sources de `connect-src` déclarées dans les en-têtes d'un vercel.json. */
function connectSources(file) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const policy = (config.headers ?? []).flatMap((rule) => rule.headers ?? []).find((header) => header.key.toLowerCase() === 'content-security-policy')?.value;
  if (!policy) {
    throw new Error(`${file} : aucune Content-Security-Policy`);
  }
  const directive = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([name]) => name === 'connect-src');
  return directive ? directive.slice(1) : [];
}
