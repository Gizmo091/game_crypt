// Statistiques du serveur
const stats = {
  connectedPlayers: 0,
  maxConnectedPlayers: 0,
  totalGamesPlayed: 0
};

export function incrementConnectedPlayers() {
  stats.connectedPlayers++;
  if (stats.connectedPlayers > stats.maxConnectedPlayers) {
    stats.maxConnectedPlayers = stats.connectedPlayers;
  }
}

export function decrementConnectedPlayers() {
  if (stats.connectedPlayers > 0) {
    stats.connectedPlayers--;
  }
}

export function incrementGamesPlayed() {
  stats.totalGamesPlayed++;
}

export function getStats() {
  return { ...stats };
}
