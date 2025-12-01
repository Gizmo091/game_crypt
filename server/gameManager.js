import { getRoom, updateRoomState, updatePlayerScore } from './roomManager.js';
import { incrementGamesPlayed } from './statsManager.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const phrases = JSON.parse(readFileSync(join(__dirname, 'data', 'phrases.json'), 'utf-8'));

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
  players.forEach(p => p.score = 0);

  return startNewRound(roomId, io);
}

export function startNewRound(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const players = Array.from(room.players.values());
  const playerIds = players.map(p => p.id);

  let guesserIndex = 0;
  if (room.currentRound) {
    const currentGuesserIndex = playerIds.indexOf(room.currentRound.guesserId);
    guesserIndex = (currentGuesserIndex + 1) % playerIds.length;
  }

  const guesserId = playerIds[guesserIndex];

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
    timeRemaining: room.roundTime,
    started: true,
    pointAwarded: false
  };

  startTimer(roomId, io);

  return {
    success: true,
    round: {
      guesserId,
      timeRemaining: room.roundTime
    },
    phrase
  };
}

function startTimer(roomId, io) {
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
  }

  const timer = setInterval(() => {
    const room = getRoom(roomId);
    if (!room || !room.currentRound) {
      clearInterval(timer);
      timers.delete(roomId);
      return;
    }

    room.currentRound.timeRemaining--;

    io.to(roomId).emit('game:timer', {
      timeRemaining: room.currentRound.timeRemaining
    });

    if (room.currentRound.timeRemaining <= 0) {
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
  const playerIds = players.map(p => p.id);

  let guesserIndex = 0;
  if (room.currentRound) {
    const currentGuesserIndex = playerIds.indexOf(room.currentRound.guesserId);
    guesserIndex = (currentGuesserIndex + 1) % playerIds.length;
  }

  const nextGuesserId = playerIds[guesserIndex];
  const nextGuesser = players.find(p => p.id === nextGuesserId);
  return nextGuesser;
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
    io.to(playerId).emit('game:round', {
      guesserId: roundData.round.guesserId,
      timeRemaining: roundData.round.timeRemaining,
      phrase: isGuesser ? roundData.phrase.coded : roundData.phrase.original,
      isGuesser
    });
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
