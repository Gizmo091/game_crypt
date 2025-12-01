import { v4 as uuidv4 } from 'uuid';

const rooms = new Map();

export function createRoom({ name, password, language, roundTime, managerId, managerName, sessionId }) {
  const id = uuidv4();
  const room = {
    id,
    name,
    password: password || null,
    language: language || 'fr',
    roundTime: roundTime || 90,
    managerId,
    players: new Map(),
    gameState: 'waiting',
    currentRound: null,
    usedPhraseIndices: []
  };

  room.players.set(managerId, {
    id: managerId,
    name: managerName,
    sessionId: sessionId,
    score: 0,
    isManager: true,
    joinedAt: Date.now()
  });

  rooms.set(id, room);
  return room;
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    language: room.language,
    playerCount: room.players.size,
    hasPassword: !!room.password,
    gameState: room.gameState
  }));
}

export function joinRoom(roomId, playerId, playerName, password, sessionId) {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (room.password && room.password !== password) {
    return { success: false, error: 'Invalid password' };
  }

  if (room.players.has(playerId)) {
    return { success: false, error: 'Already in room' };
  }

  // Vérifier que le nom n'est pas déjà utilisé par un autre joueur
  for (const player of room.players.values()) {
    if (player.name === playerName) {
      return { success: false, error: 'Ce nom est déjà utilisé dans ce salon' };
    }
  }

  room.players.set(playerId, {
    id: playerId,
    name: playerName,
    sessionId: sessionId,
    score: 0,
    isManager: false,
    joinedAt: Date.now()
  });

  return { success: true, room };
}

export function leaveRoom(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return { success: false };

  const wasManager = room.players.get(playerId)?.isManager;
  room.players.delete(playerId);

  if (room.players.size === 0) {
    rooms.delete(roomId);
    return { success: true, roomDeleted: true };
  }

  let newManagerId = null;
  if (wasManager) {
    const oldestPlayer = Array.from(room.players.values())
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];

    if (oldestPlayer) {
      oldestPlayer.isManager = true;
      room.managerId = oldestPlayer.id;
      newManagerId = oldestPlayer.id;
    }
  }

  return { success: true, roomDeleted: false, newManagerId };
}

export function deleteRoom(roomId) {
  rooms.delete(roomId);
}

export function getPlayersInRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.players.values());
}

export function getRoomForPlayer(playerId) {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) {
      return room;
    }
  }
  return null;
}

export function updateRoomState(roomId, updates) {
  const room = rooms.get(roomId);
  if (!room) return null;

  Object.assign(room, updates);
  return room;
}

export function updatePlayerScore(roomId, playerId, points) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.get(playerId);
  if (player) {
    player.score += points;
  }
  return room;
}

export function markPlayerDisconnected(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(playerId);
  if (player) {
    player.disconnected = true;
    player.disconnectedAt = Date.now();
  }
}

export function cancelPlayerDisconnect(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(playerId);
  if (player) {
    player.disconnected = false;
    player.disconnectedAt = null;
  }
}

export function rejoinRoom(roomId, newSocketId, playerName, sessionId) {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // Chercher le joueur par son nom
  let existingPlayer = null;
  let oldSocketId = null;

  for (const [socketId, player] of room.players.entries()) {
    if (player.name === playerName) {
      existingPlayer = player;
      oldSocketId = socketId;
      break;
    }
  }

  if (existingPlayer) {
    // Vérifier que le sessionId correspond
    if (existingPlayer.sessionId && existingPlayer.sessionId !== sessionId) {
      return { success: false, error: 'Session invalide - ce nom est déjà utilisé par un autre joueur' };
    }

    // Mettre à jour le socket ID du joueur existant
    room.players.delete(oldSocketId);
    existingPlayer.id = newSocketId;
    existingPlayer.disconnected = false;
    existingPlayer.disconnectedAt = null;
    room.players.set(newSocketId, existingPlayer);

    // Mettre à jour le managerId si nécessaire
    if (room.managerId === oldSocketId) {
      room.managerId = newSocketId;
    }

    // Mettre à jour le guesserId si nécessaire
    if (room.currentRound && room.currentRound.guesserId === oldSocketId) {
      room.currentRound.guesserId = newSocketId;
    }

    return {
      success: true,
      room,
      player: existingPlayer,
      isManager: existingPlayer.isManager
    };
  } else {
    // Vérifier que le nom n'est pas déjà utilisé
    for (const player of room.players.values()) {
      if (player.name === playerName) {
        return { success: false, error: 'Ce nom est déjà utilisé dans ce salon' };
      }
    }

    // Nouveau joueur qui rejoint
    const newPlayer = {
      id: newSocketId,
      name: playerName,
      sessionId: sessionId,
      score: 0,
      isManager: false,
      joinedAt: Date.now()
    };
    room.players.set(newSocketId, newPlayer);

    return {
      success: true,
      room,
      player: newPlayer,
      isManager: false,
      isNewPlayer: true
    };
  }
}
