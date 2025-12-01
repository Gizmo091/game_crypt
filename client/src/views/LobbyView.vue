<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSocket } from '../composables/useSocket'
import { useGameStore } from '../stores/gameStore'
import PlayerList from '../components/PlayerList.vue'

const router = useRouter()
const route = useRoute()
const store = useGameStore()
const { on, off, leaveRoom, startGame, socketId } = useSocket()

const isLoading = ref(true)

const canStartGame = computed(() => {
  return store.isManager && store.players.length >= 2
})

function handlePlayerJoined(data) {
  store.setPlayers(data.players)
}

function handlePlayerLeft(data) {
  store.setPlayers(data.players)
}

function handleManagerChanged(data) {
  store.setPlayers(data.players)
  store.setManager(data.newManagerId === socketId.value)
}

function handleGameStarted(data) {
  store.setPlayers(data.players)
  store.setGameState('playing')
  router.push(`/game/${route.params.roomId}`)
}

function handleLeaveRoom() {
  leaveRoom()
  store.reset()
  router.push('/')
}

function handleStartGame() {
  if (canStartGame.value) {
    startGame()
  }
}

onMounted(() => {
  on('room:player-joined', handlePlayerJoined)
  on('room:player-left', handlePlayerLeft)
  on('room:manager-changed', handleManagerChanged)
  on('game:started', handleGameStarted)

  // Attendre un peu pour laisser le temps à la reconnexion
  setTimeout(() => {
    isLoading.value = false
    if (!store.currentRoom) {
      // Vérifier si on a une session sauvegardée, sinon rediriger
      const session = store.getSavedSession()
      if (!session || session.roomId !== route.params.roomId) {
        router.push('/')
      }
    }
  }, 500)
})

onUnmounted(() => {
  off('room:player-joined', handlePlayerJoined)
  off('room:player-left', handlePlayerLeft)
  off('room:manager-changed', handleManagerChanged)
  off('game:started', handleGameStarted)
})
</script>

<template>
  <div class="lobby" v-if="store.currentRoom">
    <div class="lobby-header">
      <h2>{{ store.currentRoom.name }}</h2>
      <div class="room-info">
        <span class="badge badge-primary">{{ store.currentRoom.language.toUpperCase() }}</span>
        <span class="badge badge-success">{{ store.currentRoom.roundTime }}s par manche</span>
      </div>
    </div>

    <div class="lobby-content">
      <div class="card">
        <h3>Joueurs ({{ store.players.length }})</h3>
        <PlayerList :players="store.players" />
      </div>

      <div class="lobby-actions">
        <button
          v-if="store.isManager"
          class="btn-success"
          :disabled="!canStartGame"
          @click="handleStartGame"
        >
          {{ store.players.length < 2 ? 'En attente de joueurs...' : 'Lancer la partie' }}
        </button>
        <p v-else class="waiting-message">
          En attente du lancement par le manager...
        </p>
        <button class="btn-secondary" @click="handleLeaveRoom">
          Quitter le salon
        </button>
      </div>
    </div>
  </div>
  <div v-else-if="isLoading" class="loading">
    <p>Chargement...</p>
  </div>
</template>

<style scoped>
.lobby {
  max-width: 600px;
  margin: 0 auto;
}

.lobby-header {
  text-align: center;
  margin-bottom: 2rem;
}

.lobby-header h2 {
  margin-bottom: 0.5rem;
}

.room-info {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.lobby-content .card {
  margin-bottom: 1.5rem;
}

.lobby-content .card h3 {
  margin-bottom: 1rem;
  border-bottom: 1px solid #2d2d44;
  padding-bottom: 0.5rem;
}

.lobby-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.lobby-actions button {
  width: 100%;
  max-width: 300px;
}

.waiting-message {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
}
</style>
