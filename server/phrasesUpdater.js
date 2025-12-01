import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHRASES_PATH = join(__dirname, 'data', 'phrases.json');
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

async function downloadPhrases() {
  const repoUrl = getRepoUrl();

  if (!repoUrl) {
    console.log('No repository URL available, skipping phrases update');
    return false;
  }

  const rawUrl = getRawFileUrl(repoUrl, 'server/data/phrases.json');

  if (!rawUrl) {
    console.log('Unable to build raw file URL, skipping phrases update');
    return false;
  }

  console.log(`Fetching phrases from: ${rawUrl}`);

  try {
    const response = await fetch(rawUrl);

    if (!response.ok) {
      console.error(`Failed to fetch phrases: ${response.status} ${response.statusText}`);
      return false;
    }

    const rawText = await response.text();

    // Tenter de parser le JSON - si invalide, on garde l'ancien
    let newPhrases;
    try {
      newPhrases = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Invalid JSON received, keeping current phrases:', parseError.message);
      return false;
    }

    // Valider le format
    if (!newPhrases.fr || !newPhrases.en) {
      console.error('Invalid phrases format: missing fr or en keys, keeping current phrases');
      return false;
    }

    // Valider que les tableaux contiennent des éléments valides
    if (!Array.isArray(newPhrases.fr) || !Array.isArray(newPhrases.en)) {
      console.error('Invalid phrases format: fr and en must be arrays, keeping current phrases');
      return false;
    }

    if (newPhrases.fr.length === 0 || newPhrases.en.length === 0) {
      console.error('Invalid phrases format: empty arrays, keeping current phrases');
      return false;
    }

    // Sauvegarder les nouvelles phrases
    writeFileSync(PHRASES_PATH, JSON.stringify(newPhrases, null, 2), 'utf-8');

    console.log(`Phrases updated successfully: ${newPhrases.fr.length} FR, ${newPhrases.en.length} EN`);
    return true;
  } catch (error) {
    console.error('Error updating phrases, keeping current file:', error.message);
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
