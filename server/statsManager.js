import { getPhrasesCount } from './gameManager.js';

// Statistiques du serveur
const stats = {
  maxConnectedPlayers: 0,
  totalGamesPlayed: 0
};

// Référence à l'instance io pour compter les connexions réelles
let ioInstance = null;

export function setIoInstance(io) {
  ioInstance = io;
}

export function updateMaxConnected(currentCount) {
  if (currentCount > stats.maxConnectedPlayers) {
    stats.maxConnectedPlayers = currentCount;
  }
}

export function incrementGamesPlayed() {
  stats.totalGamesPlayed++;
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
