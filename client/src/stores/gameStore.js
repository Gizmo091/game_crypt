import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Générer un UUID (avec fallback pour contextes non-HTTPS)
function generateUUID() {
  // crypto.randomUUID n'est disponible qu'en contexte sécurisé (HTTPS/localhost)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback pour HTTP
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Générer ou récupérer un sessionId unique
function getOrCreateSessionId() {
  let sessionId = localStorage.getItem('sessionId')
  if (!sessionId) {
    sessionId = generateUUID()
    localStorage.setItem('sessionId', sessionId)
  }
  return sessionId
}

export const useGameStore = defineStore('game', () => {
  const sessionId = ref(getOrCreateSessionId())
  const playerName = ref(localStorage.getItem('playerName') || '')
  const currentRoom = ref(null)
  const players = ref([])
  const isManager = ref(false)
  const gameState = ref('waiting')
  const currentRound = ref(null)
  const phrase = ref('')
  const codedPhrase = ref('')
  const isGuesser = ref(false)
  const timeRemaining = ref(0)
  const roundStartedAt = ref(null)
  const roundDuration = ref(0)
  const lastPhrase = ref(null)
  const nextGuesser = ref(null)

  const currentPlayer = computed(() => {
    return players.value.find(p => p.isManager === isManager.value)
  })

  function setPlayerName(name) {
    playerName.value = name
    localStorage.setItem('playerName', name)
  }

  function setRoom(room) {
    currentRoom.value = room
    saveSession()
  }

  function setPlayers(newPlayers) {
    players.value = newPlayers
  }

  function setManager(value) {
    isManager.value = value
  }

  function setGameState(state) {
    gameState.value = state
    saveSession()
  }

  function setRound(round) {
    currentRound.value = round
    phrase.value = round.phrase
    codedPhrase.value = round.codedPhrase || ''
    isGuesser.value = round.isGuesser
    timeRemaining.value = round.timeRemaining
    // Stocker pour le calcul local du timer
    if (round.roundStartedAt) {
      roundStartedAt.value = round.roundStartedAt
      roundDuration.value = round.roundDuration
    }
  }

  function setTimeRemaining(time) {
    timeRemaining.value = time
  }

  function getCalculatedTimeRemaining() {
    if (!roundStartedAt.value || !roundDuration.value) {
      return timeRemaining.value
    }
    const elapsed = Math.floor((Date.now() - roundStartedAt.value) / 1000)
    return Math.max(0, roundDuration.value - elapsed)
  }

  function updatePlayerScores(newPlayers) {
    players.value = newPlayers
  }

  function setLastPhrase(phrase) {
    lastPhrase.value = phrase
  }

  function setNextGuesser(guesser) {
    nextGuesser.value = guesser
  }

  function saveSession() {
    if (currentRoom.value) {
      localStorage.setItem('gameSession', JSON.stringify({
        roomId: currentRoom.value.id,
        playerName: playerName.value,
        sessionId: sessionId.value,
        gameState: gameState.value
      }))
    }
  }

  function getSavedSession() {
    const saved = localStorage.getItem('gameSession')
    return saved ? JSON.parse(saved) : null
  }

  function clearSession() {
    localStorage.removeItem('gameSession')
  }

  function reset() {
    currentRoom.value = null
    players.value = []
    isManager.value = false
    gameState.value = 'waiting'
    currentRound.value = null
    phrase.value = ''
    codedPhrase.value = ''
    isGuesser.value = false
    timeRemaining.value = 0
    roundStartedAt.value = null
    roundDuration.value = 0
    lastPhrase.value = null
    nextGuesser.value = null
    clearSession()
  }

  return {
    sessionId,
    playerName,
    currentRoom,
    players,
    isManager,
    gameState,
    currentRound,
    phrase,
    codedPhrase,
    isGuesser,
    timeRemaining,
    roundStartedAt,
    roundDuration,
    lastPhrase,
    nextGuesser,
    currentPlayer,
    setPlayerName,
    setRoom,
    setPlayers,
    setManager,
    setGameState,
    setRound,
    setTimeRemaining,
    getCalculatedTimeRemaining,
    updatePlayerScores,
    setLastPhrase,
    setNextGuesser,
    getSavedSession,
    clearSession,
    reset
  }
})
