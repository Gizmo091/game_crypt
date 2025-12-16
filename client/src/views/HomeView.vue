<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocket } from '../composables/useSocket'
import { useGameStore } from '../stores/gameStore'
import RoomList from '../components/RoomList.vue'
import CreateRoom from '../components/CreateRoom.vue'

const router = useRouter()
const store = useGameStore()
const { rooms, on, off, requestRoomList } = useSocket()

const showCreateModal = ref(false)
const playerNameInput = ref(store.playerName)

function handleNameChange() {
  store.setPlayerName(playerNameInput.value)
}

function handleRoomCreated(data) {
  store.setRoom(data.room)
  store.setPlayers(data.players)
  store.setManager(data.isManager)
  router.push(`/lobby/${data.room.id}`)
}

function handleRoomJoined(data) {
  store.setRoom(data.room)
  store.setPlayers(data.players)
  store.setManager(data.isManager)
  store.setGameState(data.room.gameState)

  // Si une partie est en cours, aller directement dans le jeu
  if (data.currentRound) {
    store.setRound(data.currentRound)
    // Stocker les infos supplémentaires pour between_rounds
    if (data.lastPhrase) {
      store.setLastPhrase(data.lastPhrase)
    }
    if (data.nextGuesser) {
      store.setNextGuesser(data.nextGuesser)
    }
    router.push(`/game/${data.room.id}`)
  } else {
    router.push(`/lobby/${data.room.id}`)
  }
}

function handleError(data) {
  alert(data.error)
}

onMounted(() => {
  requestRoomList()
  on('room:joined', handleRoomJoined)
  on('room:error', handleError)
})

onUnmounted(() => {
  off('room:joined', handleRoomJoined)
  off('room:error', handleError)
})
</script>

<template>
  <div class="home">
    <a
      href="https://github.com/Gizmo091/game_crypt"
      target="_blank"
      rel="noopener noreferrer"
      class="github-corner"
      aria-label="View source on GitHub"
    >
      <svg width="80" height="80" viewBox="0 0 250 250" aria-hidden="true">
        <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" />
        <path
          d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
          fill="currentColor"
          style="transform-origin: 130px 106px;"
          class="octo-arm"
        />
        <path
          d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C ## 157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.3,141.5 141.3,141.5 L115.0,115.0 Z"
          fill="currentColor"
          class="octo-body"
        />
      </svg>
    </a>
    <div class="player-section card">
      <h2>Bienvenue</h2>
      <div class="form-group">
        <label for="playerName">Votre nom de joueur</label>
        <input
          id="playerName"
          v-model="playerNameInput"
          @input="handleNameChange"
          placeholder="Entrez votre nom..."
          maxlength="20"
        />
      </div>
    </div>

    <div class="rules-section card">
      <h2>Comment jouer ?</h2>
      <div class="rules-content">
        <div class="rule-item">
          <span class="rule-number">1</span>
          <div class="rule-text">
            <strong>Le devineur</strong> voit une phrase codée (ex: "Lait petit quai sous haie")
            et doit la prononcer à voix haute.
          </div>
        </div>
        <div class="rule-item">
          <span class="rule-number">2</span>
          <div class="rule-text">
            <strong>Les autres joueurs</strong> entendent la phrase codée et connaissent
            la réponse originale (ex: "Les petits cassoulets").
          </div>
        </div>
        <div class="rule-item">
          <span class="rule-number">3</span>
          <div class="rule-text">
            <strong>Aidez le devineur</strong> en mimant, dessinant ou donnant des indices
            (sans prononcer les mots de la réponse !).
          </div>
        </div>
        <div class="rule-item">
          <span class="rule-number">4</span>
          <div class="rule-text">
            <strong>Marquez des points</strong> quand le devineur trouve la bonne réponse.
            Chaque joueur devient devineur à tour de rôle !
          </div>
        </div>
      </div>
    </div>

    <div class="rooms-section">
      <div class="rooms-header">
        <h2>Salons disponibles</h2>
        <button
          class="btn-primary"
          @click="showCreateModal = true"
          :disabled="!playerNameInput.trim()"
        >
          Créer un salon
        </button>
      </div>

      <RoomList
        :rooms="rooms"
        :playerName="playerNameInput"
      />
    </div>

    <CreateRoom
      v-if="showCreateModal"
      :playerName="playerNameInput"
      @close="showCreateModal = false"
      @created="handleRoomCreated"
    />
  </div>
</template>

<style scoped>
.github-corner {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1000;
}

.github-corner svg {
  fill: #667eea;
  color: #1a1a2e;
  transition: fill 0.3s ease;
}

.github-corner:hover svg {
  fill: #764ba2;
}

.github-corner:hover .octo-arm {
  animation: octocat-wave 560ms ease-in-out;
}

@keyframes octocat-wave {
  0%, 100% { transform: rotate(0); }
  20%, 60% { transform: rotate(-25deg); }
  40%, 80% { transform: rotate(10deg); }
}

.home {
  max-width: 800px;
  margin: 0 auto;
}

.player-section {
  margin-bottom: 2rem;
}

.player-section h2 {
  margin-bottom: 1rem;
}

.rooms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.rooms-header h2 {
  margin: 0;
}

.rules-section {
  margin-bottom: 2rem;
}

.rules-section h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}

.rules-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.rule-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
}

.rule-text {
  flex: 1;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}

.rule-text strong {
  color: #667eea;
}

@media (max-width: 480px) {
  .rule-item {
    gap: 0.75rem;
  }

  .rule-number {
    min-width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .rule-text {
    font-size: 0.9rem;
  }
}
</style>
