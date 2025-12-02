import { getPhrasesCount } from './gameManager.js';
import { saveStats, loadStats, isPersistenceEnabled } from './persistenceManager.js';

// Charger les stats depuis le stockage persistant au démarrage
const stats = loadStats();

// Fonction pour sauvegarder après modification
function persistStats() {
  if (isPersistenceEnabled()) {
    saveStats({
      maxConnectedPlayers: stats.maxConnectedPlayers,
      totalGamesPlayed: stats.totalGamesPlayed
    });
  }
}

// Référence à l'instance io pour compter les connexions réelles
let ioInstance = null;

export function setIoInstance(io) {
  ioInstance = io;
}

export function updateMaxConnected(currentCount) {
  if (currentCount > stats.maxConnectedPlayers) {
    stats.maxConnectedPlayers = currentCount;
    persistStats();
  }
}

export function incrementGamesPlayed() {
  stats.totalGamesPlayed++;
  persistStats();
}

export function getStats() {
  // Utiliser le vrai compteur de Socket.io
  const connectedPlayers = ioInstance ? ioInstance.engine.clientsCount : 0;

  // Mettre à jour le max si nécessaire
  updateMaxConnected(connectedPlayers);

  // Obtenir le nombre de phrases par langue
  const phrasesCount = getPhrasesCount();

  return {
    connectedPlayers,
    maxConnectedPlayers: stats.maxConnectedPlayers,
    totalGamesPlayed: stats.totalGamesPlayed,
    phrasesFr: phrasesCount.fr,
    phrasesEn: phrasesCount.en
  };
}
