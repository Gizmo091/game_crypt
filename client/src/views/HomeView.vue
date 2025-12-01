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
