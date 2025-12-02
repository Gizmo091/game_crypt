import { getRoom, updateRoomState, updatePlayerScore, getAllRoomsMap } from './roomManager.js';
import { incrementGamesPlayed, setPhrasesCountGetter } from './statsManager.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHRASES_FR_PATH = join(__dirname, 'data', 'phrases_fr.json');
const PHRASES_EN_PATH = join(__dirname, 'data', 'phrases_en.json');

// Phrases en mémoire
let phrases = {
  fr: JSON.parse(readFileSync(PHRASES_FR_PATH, 'utf-8')),
  en: JSON.parse(readFileSync(PHRASES_EN_PATH, 'utf-8'))
};

// Recharger les phrases depuis les fichiers
export function reloadPhrases() {
  try {
    phrases = {
      fr: JSON.parse(readFileSync(PHRASES_FR_PATH, 'utf-8')),
      en: JSON.parse(readFileSync(PHRASES_EN_PATH, 'utf-8'))
    };
    console.log('Phrases reloaded in memory');
    return true;
  } catch (error) {
    console.error('Error reloading phrases:', error.message);
    return false;
  }
}

// Obtenir le nombre de phrases par langue
export function getPhrasesCount() {
  return {
    fr: phrases.fr.length,
    en: phrases.en.length
  };
}

// Enregistrer le getter pour statsManager (évite la dépendance circulaire)
setPhrasesCountGetter(getPhrasesCount);

const timers = new Map();

export function startGame(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  if (room.players.size < 2) {
    return { success: false, error: 'Need at least 2 players' };
  }

  // Incrémenter le compteur de parties jouées
  incrementGamesPlayed();

  room.gameState = 'playing';
  room.usedPhraseIndices = [];

  const players = Array.from(room.players.values());
  players.forEach(p => {
    p.score = 0;
    p.roundsAsGuesser = 0;
    p.consecutiveGuesserRounds = 0;
  });

  return startNewRound(roomId, io);
}

export function startNewRound(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const previousGuesserId = room.currentRound?.guesserId;

  // Sélectionner le prochain guesser avec la nouvelle logique
  const nextGuesser = getNextGuesser(room);
  if (!nextGuesser) return { success: false, error: 'No players available' };

  const guesserId = nextGuesser.id;

  // Mettre à jour les compteurs de manches
  room.players.forEach((player, playerId) => {
    if (playerId === guesserId) {
      // Ce joueur devient le guesser
      player.roundsAsGuesser = (player.roundsAsGuesser || 0) + 1;
      if (playerId === previousGuesserId) {
        player.consecutiveGuesserRounds = (player.consecutiveGuesserRounds || 0) + 1;
      } else {
        player.consecutiveGuesserRounds = 1;
      }
    } else {
      // Réinitialiser le compteur consécutif pour les autres
      player.consecutiveGuesserRounds = 0;
    }
  });

  const languagePhrases = phrases[room.language] || phrases['fr'];
  const availableIndices = languagePhrases
    .map((_, i) => i)
    .filter(i => !room.usedPhraseIndices.includes(i));

  if (availableIndices.length === 0) {
    room.usedPhraseIndices = [];
    availableIndices.push(...languagePhrases.map((_, i) => i));
  }

  const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  room.usedPhraseIndices.push(randomIndex);
  const phrase = languagePhrases[randomIndex];

  room.currentRound = {
    guesserId,
    phrase,
    roundStartedAt: Date.now(),
    roundDuration: room.roundTime,
    started: true,
    pointAwarded: false
  };

  startTimer(roomId, io);

  return {
    success: true,
    round: {
      guesserId,
      timeRemaining: room.currentRound.roundDuration
    },
    phrase
  };
}

export function getTimeRemaining(room) {
  if (!room.currentRound) return 0;
  const elapsed = Math.floor((Date.now() - room.currentRound.roundStartedAt) / 1000);
  return Math.max(0, room.currentRound.roundDuration - elapsed);
}

function startTimer(roomId, io) {
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
  }

  const room = getRoom(roomId);
  if (!room || !room.currentRound) return;

  // Envoyer immédiatement le temps restant actuel
  const initialTimeRemaining = getTimeRemaining(room);
  io.to(roomId).emit('game:timer', { timeRemaining: initialTimeRemaining });

  // Si déjà expiré, terminer le round
  if (initialTimeRemaining <= 0) {
    endRound(roomId, io, false);
    return;
  }

  const timer = setInterval(() => {
    const room = getRoom(roomId);
    if (!room || !room.currentRound) {
      clearInterval(timer);
      timers.delete(roomId);
      return;
    }

    const timeRemaining = getTimeRemaining(room);

    io.to(roomId).emit('game:timer', { timeRemaining });

    if (timeRemaining <= 0) {
      clearInterval(timer);
      timers.delete(roomId);
      endRound(roomId, io, false);
    }
  }, 1000);

  timers.set(roomId, timer);
}

export function validatePoint(roomId, io) {
  const room = getRoom(roomId);
  if (!room || !room.currentRound) return { success: false };

  if (room.currentRound.pointAwarded) {
    return { success: false, error: 'Point already awarded' };
  }

  room.currentRound.pointAwarded = true;
  updatePlayerScore(roomId, room.currentRound.guesserId, 1);

  io.to(roomId).emit('game:point-awarded', {
    playerId: room.currentRound.guesserId,
    players: Array.from(room.players.values())
  });

  // Arrêter le timer et passer en mode "entre les manches"
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
    timers.delete(roomId);
  }

  return endRound(roomId, io, true);
}

export function skipRound(roomId, io) {
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
    timers.delete(roomId);
  }

  return endRound(roomId, io, false);
}

function getNextGuesser(room) {
  const players = Array.from(room.players.values());
  if (players.length === 0) return null;

  const currentGuesserId = room.currentRound?.guesserId;

  // Trouver le joueur avec le moins de manches jouées comme devineur
  // En cas d'égalité, suivre l'ordre de joinedAt (round-robin)
  // Ne pas dépasser 2 manches consécutives

  // Trier par : 1) roundsAsGuesser (asc), 2) joinedAt (asc)
  const sortedPlayers = [...players].sort((a, b) => {
    const aRounds = a.roundsAsGuesser || 0;
    const bRounds = b.roundsAsGuesser || 0;
    if (aRounds !== bRounds) return aRounds - bRounds;
    return a.joinedAt - b.joinedAt;
  });

  // Filtrer les joueurs qui peuvent être guesser (pas plus de 2 consécutives)
  const eligiblePlayers = sortedPlayers.filter(p => {
    // Si c'est le guesser actuel, vérifier s'il peut continuer
    if (p.id === currentGuesserId) {
      return (p.consecutiveGuesserRounds || 0) < 2;
    }
    return true;
  });

  // Prendre le premier éligible avec le moins de manches
  if (eligiblePlayers.length > 0) {
    const minRounds = eligiblePlayers[0].roundsAsGuesser || 0;
    // Parmi ceux qui ont le minimum, prendre le premier par joinedAt
    const candidates = eligiblePlayers.filter(p => (p.roundsAsGuesser || 0) === minRounds);
    return candidates[0];
  }

  // Fallback : prendre le premier joueur
  return players[0];
}

function endRound(roomId, io, guessed) {
  const room = getRoom(roomId);
  if (!room || !room.currentRound) return { success: false };

  const phrase = room.currentRound.phrase;

  // Passer en état "between_rounds"
  room.gameState = 'between_rounds';

  // Calculer le prochain joueur à deviner
  const nextGuesser = getNextGuesser(room);

  io.to(roomId).emit('game:round-end', {
    guessed,
    phrase,
    players: Array.from(room.players.values()),
    nextGuesser: nextGuesser ? { id: nextGuesser.id, name: nextGuesser.name } : null
  });

  return { success: true };
}

export function nextRound(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  if (room.gameState !== 'between_rounds') {
    return { success: false, error: 'Not between rounds' };
  }

  room.gameState = 'playing';

  const result = startNewRound(roomId, io);
  if (result.success) {
    emitRoundStart(roomId, io, result);
  }

  return result;
}

function emitRoundStart(roomId, io, roundData) {
  const room = getRoom(roomId);
  if (!room) return;

  room.players.forEach((player, playerId) => {
    const isGuesser = playerId === roundData.round.guesserId;
    const data = {
      guesserId: roundData.round.guesserId,
      timeRemaining: roundData.round.timeRemaining,
      roundStartedAt: room.currentRound.roundStartedAt,
      roundDuration: room.currentRound.roundDuration,
      phrase: isGuesser ? roundData.phrase.coded : roundData.phrase.original,
      isGuesser
    };
    // Les non-devieurs voient aussi la phrase codée pour mieux aider
    if (!isGuesser) {
      data.codedPhrase = roundData.phrase.coded;
    }
    io.to(playerId).emit('game:round', data);
  });
}

export function endGame(roomId, io) {
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
    timers.delete(roomId);
  }

  const room = getRoom(roomId);
  if (!room) return { success: false };

  room.gameState = 'waiting';
  room.currentRound = null;

  const players = Array.from(room.players.values());
  const winner = players.reduce((prev, current) =>
    (prev.score > current.score) ? prev : current
  );

  io.to(roomId).emit('game:ended', {
    winner,
    players
  });

  return { success: true };
}

export function cleanupRoom(roomId) {
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
    timers.delete(roomId);
  }
}

// Restaurer les timers pour les parties en cours après redémarrage du serveur
export function restoreTimers(io) {
  const rooms = getAllRoomsMap();
  let restoredCount = 0;

  for (const [roomId, room] of rooms.entries()) {
    if (room.gameState === 'playing' && room.currentRound) {
      const timeRemaining = getTimeRemaining(room);

      if (timeRemaining > 0) {
        console.log(`[GameManager] Restoring timer for room ${roomId} (${timeRemaining}s remaining)`);
        startTimer(roomId, io);
        restoredCount++;
      } else {
        // Le temps est écoulé, terminer le round
        console.log(`[GameManager] Room ${roomId} timer expired during restart, ending round`);
        endRound(roomId, io, false);
      }
    }
  }

  if (restoredCount > 0) {
    console.log(`[GameManager] Restored ${restoredCount} game timers`);
  }
}
