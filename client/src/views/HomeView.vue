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
</style>
