import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PERSISTENT_PATH = process.env.PERSISTENT_PATH || null;

const ROOMS_FILE = 'rooms.json';
const STATS_FILE = 'stats.json';

// Debounce pour éviter les écritures trop fréquentes
const saveTimers = new Map();
const SAVE_DELAY = 1000; // 1 seconde

function ensureDirectory() {
  if (PERSISTENT_PATH && !existsSync(PERSISTENT_PATH)) {
    mkdirSync(PERSISTENT_PATH, { recursive: true });
  }
}

function getFilePath(filename) {
  if (!PERSISTENT_PATH) return null;
  return join(PERSISTENT_PATH, filename);
}

export function isPersistenceEnabled() {
  return !!PERSISTENT_PATH;
}

// Sauvegarde avec debounce
function debouncedSave(key, data, filename) {
  if (!PERSISTENT_PATH) return;

  if (saveTimers.has(key)) {
    clearTimeout(saveTimers.get(key));
  }

  saveTimers.set(key, setTimeout(() => {
    try {
      ensureDirectory();
      const filePath = getFilePath(filename);
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[Persistence] Saved ${filename}`);
    } catch (error) {
      console.error(`[Persistence] Error saving ${filename}:`, error.message);
    }
    saveTimers.delete(key);
  }, SAVE_DELAY));
}

// Convertir Map en objet pour JSON
function mapToObject(map) {
  const obj = {};
  for (const [key, value] of map.entries()) {
    if (value instanceof Map) {
      obj[key] = mapToObject(value);
    } else if (typeof value === 'object' && value !== null) {
      obj[key] = { ...value };
      // Convertir les Maps imbriquées (comme players)
      for (const [k, v] of Object.entries(obj[key])) {
        if (v instanceof Map) {
          obj[key][k] = mapToObject(v);
        }
      }
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

// Convertir objet en Map
function objectToMap(obj) {
  const map = new Map();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key, value);
  }
  return map;
}

// ===== ROOMS =====

export function saveRooms(rooms) {
  if (!PERSISTENT_PATH) return;

  const roomsData = {};
  for (const [roomId, room] of rooms.entries()) {
    roomsData[roomId] = {
      ...room,
      players: mapToObject(room.players)
    };
  }

  debouncedSave('rooms', roomsData, ROOMS_FILE);
}

export function loadRooms() {
  if (!PERSISTENT_PATH) return new Map();

  const filePath = getFilePath(ROOMS_FILE);
  if (!filePath || !existsSync(filePath)) {
    console.log('[Persistence] No rooms file found, starting fresh');
    return new Map();
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const rooms = new Map();

    for (const [roomId, roomData] of Object.entries(data)) {
      const room = {
        ...roomData,
        players: new Map()
      };

      // Reconstruire la Map des joueurs
      if (roomData.players) {
        for (const [playerId, player] of Object.entries(roomData.players)) {
          room.players.set(playerId, player);
        }
      }

      rooms.set(roomId, room);
    }

    console.log(`[Persistence] Loaded ${rooms.size} rooms`);
    return rooms;
  } catch (error) {
    console.error('[Persistence] Error loading rooms:', error.message);
    return new Map();
  }
}

// ===== STATS =====

export function saveStats(stats) {
  if (!PERSISTENT_PATH) return;

  debouncedSave('stats', stats, STATS_FILE);
}

export function loadStats() {
  if (!PERSISTENT_PATH) {
    return { maxConnectedPlayers: 0, totalGamesPlayed: 0 };
  }

  const filePath = getFilePath(STATS_FILE);
  if (!filePath || !existsSync(filePath)) {
    console.log('[Persistence] No stats file found, starting fresh');
    return { maxConnectedPlayers: 0, totalGamesPlayed: 0 };
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    console.log(`[Persistence] Loaded stats: ${data.totalGamesPlayed} games played, max ${data.maxConnectedPlayers} players`);
    return data;
  } catch (error) {
    console.error('[Persistence] Error loading stats:', error.message);
    return { maxConnectedPlayers: 0, totalGamesPlayed: 0 };
  }
}

// Initialisation
if (PERSISTENT_PATH) {
  console.log(`[Persistence] Enabled with path: ${PERSISTENT_PATH}`);
  ensureDirectory();
} else {
  console.log('[Persistence] Disabled (no PERSISTENT_PATH set)');
}
