import {
  createRoom,
  getRoom,
  getAllRooms,
  joinRoom,
  rejoinRoom,
  leaveRoom,
  getPlayersInRoom,
  getRoomForPlayer,
  markPlayerDisconnected,
  cancelPlayerDisconnect
} from './roomManager.js';

import {
  startGame,
  validatePoint,
  skipRound,
  nextRound,
  endGame,
  cleanupRoom,
  restoreTimers,
  getTimeRemaining
} from './gameManager.js';

import {
  setIoInstance,
  getStats
} from './statsManager.js';

// Map pour stocker les timeouts de déconnexion
const disconnectTimeouts = new Map();
const DISCONNECT_GRACE_PERIOD = 5000; // 5 secondes

// Broadcast des stats toutes les 10 secondes
let statsInterval = null;

function broadcastStats(io) {
  io.emit('stats:update', getStats());
}

export function setupSocketHandlers(io) {
  // Enregistrer l'instance io pour les stats
  setIoInstance(io);

  // Restaurer les timers des parties en cours (après redémarrage serveur)
  restoreTimers(io);

  // Démarrer le broadcast périodique des stats
  if (!statsInterval) {
    statsInterval = setInterval(() => broadcastStats(io), 10000);
  }

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Envoyer les stats au nouveau connecté (avec un petit délai pour que le compteur soit à jour)
    setTimeout(() => {
      socket.emit('stats:update', getStats());
      broadcastStats(io);
    }, 100);

    socket.emit('room:list-update', getAllRooms());

    socket.on('room:list', () => {
      socket.emit('room:list-update', getAllRooms());
    });

    socket.on('room:create', ({ name, password, language, roundTime, playerName, sessionId }) => {
      const room = createRoom({
        name,
        password,
        language,
        roundTime,
        managerId: socket.id,
        managerName: playerName,
        sessionId
      });

      socket.join(room.id);

      socket.emit('room:joined', {
        room: {
          id: room.id,
          name: room.name,
          language: room.language,
          roundTime: room.roundTime,
          hasPassword: !!room.password,
          gameState: room.gameState
        },
        players: getPlayersInRoom(room.id),
        isManager: true
      });

      io.emit('room:list-update', getAllRooms());
    });

    socket.on('room:join', ({ roomId, playerName, password, sessionId }) => {
      const result = joinRoom(roomId, socket.id, playerName, password, sessionId);

      if (!result.success) {
        socket.emit('room:error', { error: result.error });
        return;
      }

      socket.join(roomId);

      const room = result.room;
      const playersList = getPlayersInRoom(roomId); // Cache pour éviter les appels multiples
      const joinData = {
        room: {
          id: room.id,
          name: room.name,
          language: room.language,
          roundTime: room.roundTime,
          hasPassword: !!room.password,
          gameState: room.gameState
        },
        players: playersList,
        isManager: false
      };

      // Si une partie est en cours, envoyer les infos de la manche
      if ((room.gameState === 'playing' || room.gameState === 'between_rounds') && room.currentRound) {
        joinData.currentRound = {
          guesserId: room.currentRound.guesserId,
          timeRemaining: getTimeRemaining(room),
          phrase: room.currentRound.phrase.original, // Le nouveau joueur n'est jamais le guesser
          codedPhrase: room.currentRound.phrase.coded, // La phrase codée pour aider
          isGuesser: false
        };

        // Si entre les manches, envoyer aussi la phrase précédente et le prochain guesser
        if (room.gameState === 'between_rounds') {
          joinData.lastPhrase = room.currentRound.phrase;
          // Calculer le prochain guesser
          const players = Array.from(room.players.values());
          const playerIds = players.map(p => p.id);
          const currentGuesserIndex = playerIds.indexOf(room.currentRound.guesserId);
          const nextGuesserIndex = (currentGuesserIndex + 1) % playerIds.length;
          const nextGuesser = players[nextGuesserIndex];
          if (nextGuesser) {
            joinData.nextGuesser = { id: nextGuesser.id, name: nextGuesser.name };
          }
        }
      }

      socket.emit('room:joined', joinData);

      socket.to(roomId).emit('room:player-joined', {
        player: room.players.get(socket.id),
        players: playersList
      });

      io.emit('room:list-update', getAllRooms());
    });

    socket.on('room:rejoin', ({ roomId, playerName, sessionId }) => {
      // Annuler tout timeout de déconnexion existant pour ce joueur
      const timeoutKey = `${roomId}:${playerName}`;
      if (disconnectTimeouts.has(timeoutKey)) {
        clearTimeout(disconnectTimeouts.get(timeoutKey));
        disconnectTimeouts.delete(timeoutKey);
        console.log(`Cancelled disconnect timeout for ${playerName} in room ${roomId}`);
      }

      const result = rejoinRoom(roomId, socket.id, playerName, sessionId);

      if (!result.success) {
        socket.emit('room:rejoin-failed', { error: result.error });
        return;
      }

      // Annuler le statut déconnecté
      cancelPlayerDisconnect(roomId, socket.id);

      socket.join(roomId);

      const room = result.room;
      const roomData = {
        room: {
          id: room.id,
          name: room.name,
          language: room.language,
          roundTime: room.roundTime,
          hasPassword: !!room.password,
          gameState: room.gameState
        },
        players: getPlayersInRoom(roomId),
        isManager: result.isManager
      };

      // Envoyer l'état actuel de la manche si une partie est en cours
      if ((room.gameState === 'playing' || room.gameState === 'between_rounds') && room.currentRound) {
        const isGuesser = socket.id === room.currentRound.guesserId;
        roomData.currentRound = {
          guesserId: room.currentRound.guesserId,
          timeRemaining: getTimeRemaining(room),
          roundStartedAt: room.currentRound.roundStartedAt,
          roundDuration: room.currentRound.roundDuration,
          phrase: isGuesser ? room.currentRound.phrase.coded : room.currentRound.phrase.original,
          isGuesser
        };
        // Les non-devieurs ont aussi besoin de la phrase codée
        if (!isGuesser) {
          roomData.currentRound.codedPhrase = room.currentRound.phrase.coded;
        }

        // Si entre les manches, envoyer la phrase complète et le prochain guesser
        if (room.gameState === 'between_rounds') {
          roomData.lastPhrase = room.currentRound.phrase;
          // Calculer le prochain guesser
          const players = Array.from(room.players.values());
          const sortedPlayers = [...players].sort((a, b) => {
            const aRounds = a.roundsAsGuesser || 0;
            const bRounds = b.roundsAsGuesser || 0;
            if (aRounds !== bRounds) return aRounds - bRounds;
            return a.joinedAt - b.joinedAt;
          });
          if (sortedPlayers.length > 0) {
            roomData.nextGuesser = { id: sortedPlayers[0].id, name: sortedPlayers[0].name };
          }
        }
      }

      socket.emit('room:rejoined', roomData);

      // Notifier les autres joueurs si c'est un nouveau joueur
      if (result.isNewPlayer) {
        socket.to(roomId).emit('room:player-joined', {
          player: result.player,
          players: getPlayersInRoom(roomId)
        });
      }

      io.emit('room:list-update', getAllRooms());
    });

    socket.on('room:leave', () => {
      // Quitter volontairement = suppression immédiate
      handlePlayerLeave(socket, io, true);
    });

    socket.on('game:start', () => {
      const room = getRoomForPlayer(socket.id);
      if (!room) return;

      if (room.managerId !== socket.id) {
        socket.emit('game:error', { error: 'Only the manager can start the game' });
        return;
      }

      const result = startGame(room.id, io);

      if (!result.success) {
        socket.emit('game:error', { error: result.error });
        return;
      }

      io.to(room.id).emit('game:started', {
        players: getPlayersInRoom(room.id)
      });

      room.players.forEach((player, playerId) => {
        const isGuesser = playerId === result.round.guesserId;
        const roundData = {
          guesserId: result.round.guesserId,
          timeRemaining: result.round.timeRemaining,
          roundStartedAt: room.currentRound.roundStartedAt,
          roundDuration: room.currentRound.roundDuration,
          phrase: isGuesser ? result.phrase.coded : result.phrase.original,
          isGuesser
        };
        // Les non-devieurs voient aussi la phrase codée pour mieux aider
        if (!isGuesser) {
          roundData.codedPhrase = result.phrase.coded;
        }
        io.to(playerId).emit('game:round', roundData);
      });

      io.emit('room:list-update', getAllRooms());
    });

    socket.on('game:validate-point', () => {
      const room = getRoomForPlayer(socket.id);
      if (!room) return;

      if (room.managerId !== socket.id) {
        socket.emit('game:error', { error: 'Only the manager can validate points' });
        return;
      }

      validatePoint(room.id, io);
    });

    socket.on('game:skip', () => {
      const room = getRoomForPlayer(socket.id);
      if (!room) return;

      if (room.managerId !== socket.id) {
        socket.emit('game:error', { error: 'Only the manager can skip rounds' });
        return;
      }

      skipRound(room.id, io);
    });

    socket.on('game:next-round', () => {
      const room = getRoomForPlayer(socket.id);
      if (!room) return;

      if (room.managerId !== socket.id) {
        socket.emit('game:error', { error: 'Only the manager can start the next round' });
        return;
      }

      const result = nextRound(room.id, io);

      if (!result.success) {
        socket.emit('game:error', { error: result.error });
      }
    });

    socket.on('game:end', () => {
      const room = getRoomForPlayer(socket.id);
      if (!room) return;

      if (room.managerId !== socket.id) {
        socket.emit('game:error', { error: 'Only the manager can end the game' });
        return;
      }

      endGame(room.id, io);
      io.emit('room:list-update', getAllRooms());
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      // Broadcast des stats mises à jour (avec délai pour que le compteur soit à jour)
      setTimeout(() => broadcastStats(io), 100);
      // Déconnexion = délai de grâce avant suppression
      handlePlayerDisconnect(socket, io);
    });
  });
}

function handlePlayerDisconnect(socket, io) {
  const room = getRoomForPlayer(socket.id);
  if (!room) return;

  const roomId = room.id;
  const player = room.players.get(socket.id);
  if (!player) return;

  const playerName = player.name;

  // Marquer le joueur comme déconnecté
  markPlayerDisconnected(roomId, socket.id);

  console.log(`Player ${playerName} disconnected, waiting ${DISCONNECT_GRACE_PERIOD}ms before removal`);

  // Créer un timeout pour la suppression définitive
  const timeoutKey = `${roomId}:${playerName}`;
  const timeout = setTimeout(() => {
    console.log(`Grace period expired for ${playerName}, removing from room`);
    disconnectTimeouts.delete(timeoutKey);

    // Vérifier que le joueur est toujours marqué comme déconnecté
    const currentRoom = getRoom(roomId);
    if (!currentRoom) return;

    // Chercher le joueur par son nom (le socket ID peut avoir changé)
    let playerToRemove = null;
    let socketIdToRemove = null;
    for (const [sid, p] of currentRoom.players.entries()) {
      if (p.name === playerName && p.disconnected) {
        playerToRemove = p;
        socketIdToRemove = sid;
        break;
      }
    }

    if (playerToRemove && socketIdToRemove) {
      const result = leaveRoom(roomId, socketIdToRemove);

      if (result.roomDeleted) {
        cleanupRoom(roomId);
      } else {
        if (result.newManagerId) {
          io.to(roomId).emit('room:manager-changed', {
            newManagerId: result.newManagerId,
            players: getPlayersInRoom(roomId)
          });
        }

        io.to(roomId).emit('room:player-left', {
          playerId: socketIdToRemove,
          players: getPlayersInRoom(roomId)
        });

        const updatedRoom = getRoom(roomId);
        if (updatedRoom && updatedRoom.players.size < 2 && updatedRoom.gameState === 'playing') {
          endGame(roomId, io);
        }
      }

      io.emit('room:list-update', getAllRooms());
    }
  }, DISCONNECT_GRACE_PERIOD);

  disconnectTimeouts.set(timeoutKey, timeout);
}

function handlePlayerLeave(socket, io, immediate = false) {
  const room = getRoomForPlayer(socket.id);
  if (!room) return;

  const roomId = room.id;
  const player = room.players.get(socket.id);

  // Annuler tout timeout existant
  if (player) {
    const timeoutKey = `${roomId}:${player.name}`;
    if (disconnectTimeouts.has(timeoutKey)) {
      clearTimeout(disconnectTimeouts.get(timeoutKey));
      disconnectTimeouts.delete(timeoutKey);
    }
  }

  const result = leaveRoom(roomId, socket.id);

  socket.leave(roomId);

  if (result.roomDeleted) {
    cleanupRoom(roomId);
  } else {
    if (result.newManagerId) {
      io.to(roomId).emit('room:manager-changed', {
        newManagerId: result.newManagerId,
        players: getPlayersInRoom(roomId)
      });
    }

    io.to(roomId).emit('room:player-left', {
      playerId: socket.id,
      players: getPlayersInRoom(roomId)
    });

    const currentRoom = getRoom(roomId);
    if (currentRoom && currentRoom.players.size < 2 && currentRoom.gameState === 'playing') {
      endGame(roomId, io);
    }
  }

  io.emit('room:list-update', getAllRooms());
}
