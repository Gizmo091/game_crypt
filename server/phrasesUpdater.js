import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import { reloadPhrases } from './gameManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHRASES_FR_PATH = join(__dirname, 'data', 'phrases_fr.json');
const PHRASES_EN_PATH = join(__dirname, 'data', 'phrases_en.json');
const UPDATE_INTERVAL = 60 * 60 * 1000; // 1 heure

let updateTimer = null;

function getGitRemoteUrl() {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: __dirname,
      encoding: 'utf-8'
    }).trim();

    // Convertir SSH en HTTPS si nécessaire
    // git@github.com:user/repo.git -> https://github.com/user/repo
    if (remoteUrl.startsWith('git@github.com:')) {
      const path = remoteUrl.replace('git@github.com:', '').replace('.git', '');
      return `https://github.com/${path}`;
    }

    // Nettoyer l'URL HTTPS
    return remoteUrl.replace('.git', '');
  } catch (error) {
    console.error('Unable to get git remote URL:', error.message);
    return null;
  }
}

function getRepoUrl() {
  // Priorité à la variable d'environnement
  if (process.env.GITHUB_REPO_URL) {
    return process.env.GITHUB_REPO_URL;
  }

  // Sinon, utiliser le repo git courant
  return getGitRemoteUrl();
}

function getRawFileUrl(repoUrl, filePath) {
  // Convertir l'URL GitHub en URL raw
  // https://github.com/user/repo -> https://raw.githubusercontent.com/user/repo/main/filePath
  if (repoUrl.includes('github.com')) {
    const rawUrl = repoUrl.replace('github.com', 'raw.githubusercontent.com');
    return `${rawUrl}/main/${filePath}`;
  }
  return null;
}

async function downloadPhrasesForLanguage(repoUrl, lang) {
  const rawUrl = getRawFileUrl(repoUrl, `server/data/phrases_${lang}.json`);

  if (!rawUrl) {
    console.log(`Unable to build raw file URL for ${lang}, skipping`);
    return null;
  }

  console.log(`Fetching ${lang} phrases from: ${rawUrl}`);

  const response = await fetch(rawUrl);

  if (!response.ok) {
    console.error(`Failed to fetch ${lang} phrases: ${response.status} ${response.statusText}`);
    return null;
  }

  const rawText = await response.text();
  const phrases = JSON.parse(rawText);

  if (!Array.isArray(phrases) || phrases.length === 0) {
    console.error(`Invalid ${lang} phrases format: must be non-empty array`);
    return null;
  }

  return phrases;
}

async function downloadPhrases() {
  const repoUrl = getRepoUrl();

  if (!repoUrl) {
    console.log('No repository URL available, skipping phrases update');
    return false;
  }

  try {
    const [frPhrases, enPhrases] = await Promise.all([
      downloadPhrasesForLanguage(repoUrl, 'fr'),
      downloadPhrasesForLanguage(repoUrl, 'en')
    ]);

    let updated = false;

    if (frPhrases) {
      writeFileSync(PHRASES_FR_PATH, JSON.stringify(frPhrases, null, 2), 'utf-8');
      console.log(`FR phrases updated: ${frPhrases.length} phrases`);
      updated = true;
    }

    if (enPhrases) {
      writeFileSync(PHRASES_EN_PATH, JSON.stringify(enPhrases, null, 2), 'utf-8');
      console.log(`EN phrases updated: ${enPhrases.length} phrases`);
      updated = true;
    }

    if (updated) {
      reloadPhrases();
    }

    return updated;
  } catch (error) {
    console.error('Error updating phrases, keeping current files:', error.message);
    return false;
  }
}

export function startPhrasesUpdater() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log('Development mode: phrases auto-update disabled');
    return;
  }

  console.log('Starting phrases updater...');

  // Mise à jour initiale après un délai (laisser le serveur démarrer)
  setTimeout(() => {
    downloadPhrases();
  }, 10000); // 10 secondes après le démarrage

  // Mises à jour régulières
  updateTimer = setInterval(() => {
    downloadPhrases();
  }, UPDATE_INTERVAL);

  console.log(`Phrases will be updated every ${UPDATE_INTERVAL / 1000 / 60} minutes`);
}

export function stopPhrasesUpdater() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
    console.log('Phrases updater stopped');
  }
}

export { downloadPhrases };
