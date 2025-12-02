<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocket } from './composables/useSocket'
import { useGameStore } from './stores/gameStore'

const router = useRouter()
const store = useGameStore()
const { connect, disconnect, on, off, rejoinRoom, setOnReconnect } = useSocket()

const stats = ref({
  connectedPlayers: 0,
  maxConnectedPlayers: 0,
  totalGamesPlayed: 0,
  phrasesFr: 0,
  phrasesEn: 0
})

function handleRejoined(data) {
  console.log('[App] handleRejoined received:', {
    gameState: data.room?.gameState,
    hasCurrentRound: !!data.currentRound,
    currentRound: data.currentRound ? {
      timeRemaining: data.currentRound.timeRemaining,
      roundStartedAt: data.currentRound.roundStartedAt,
      roundDuration: data.currentRound.roundDuration
    } : null
  })
  store.setRoom(data.room)
  store.setPlayers(data.players)
  store.setManager(data.isManager)
  store.setGameState(data.room.gameState)

  if (data.currentRound) {
    store.setRound(data.currentRound)
  }

  // Stocker lastPhrase et nextGuesser pour between_rounds
  if (data.lastPhrase) {
    store.setLastPhrase(data.lastPhrase)
  }
  if (data.nextGuesser) {
    store.setNextGuesser(data.nextGuesser)
  }

  if (data.room.gameState === 'playing' || data.room.gameState === 'between_rounds') {
    router.push(`/game/${data.room.id}`)
  } else if (data.room.gameState === 'waiting') {
    router.push(`/lobby/${data.room.id}`)
  }
}

function handleRejoinFailed() {
  store.clearSession()
  router.push('/')
}

function handleStatsUpdate(data) {
  stats.value = data
}

function tryRejoin() {
  const session = store.getSavedSession()
  if (session && session.roomId && session.playerName && session.sessionId) {
    rejoinRoom({
      roomId: session.roomId,
      playerName: session.playerName,
      sessionId: session.sessionId
    })
  }
}

let checkInterval = null

onMounted(() => {
  connect()

  on('room:rejoined', handleRejoined)
  on('room:rejoin-failed', handleRejoinFailed)
  on('stats:update', handleStatsUpdate)

  // Configurer le callback de reconnexion automatique
  setOnReconnect(() => {
    tryRejoin()
  })

  // Attendre que la connexion soit établie avant de tenter le rejoin
  let checkCount = 0
  const maxChecks = 30 // 3 secondes max
  checkInterval = setInterval(() => {
    checkCount++
    const { isConnected } = useSocket()
    if (isConnected.value || checkCount >= maxChecks) {
      clearInterval(checkInterval)
      checkInterval = null
      if (isConnected.value) {
        tryRejoin()
      }
    }
  }, 100)
})

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  off('room:rejoined', handleRejoined)
  off('room:rejoin-failed', handleRejoinFailed)
  off('stats:update', handleStatsUpdate)
  disconnect()
})
</script>

<template>
  <div id="app-container">
    <header>
      <h1>Coded Words</h1>
      <div class="user-info" v-if="store.playerName">
        <span class="user-icon">👤</span>
        <span class="user-name">{{ store.playerName }}</span>
      </div>
    </header>
    <main>
      <router-view />
    </main>
    <footer>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Joueurs en ligne</span>
          <span class="stat-value">{{ stats.connectedPlayers }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Record de joueurs</span>
          <span class="stat-value">{{ stats.maxConnectedPlayers }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">parties jouées</span>
          <span class="stat-value">{{ stats.totalGamesPlayed }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">phrases FR</span>
          <span class="stat-value">{{ stats.phrasesFr }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">phrases EN</span>
          <span class="stat-value">{{ stats.phrasesEn }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
#app-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #333;
  margin-bottom: 2rem;
}

header h1 {
  margin: 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 20px;
}

.user-icon {
  font-size: 1rem;
}

.user-name {
  font-weight: 600;
  color: #667eea;
}

main {
  padding: 0 1rem;
  min-height: calc(100vh - 200px);
}

footer {
  margin-top: 3rem;
  padding: 1.5rem 0;
  border-top: 1px solid #333;
}

.stats {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

@media (max-width: 480px) {
  .stats {
    gap: 1rem 1.5rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.65rem;
  }
}
</style>
