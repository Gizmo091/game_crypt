<script setup>
import { ref } from 'vue'
import { useSocket } from '../composables/useSocket'
import { useGameStore } from '../stores/gameStore'

const props = defineProps({
  rooms: {
    type: Array,
    default: () => []
  },
  playerName: {
    type: String,
    default: ''
  }
})

const store = useGameStore()
const { joinRoom } = useSocket()

const passwordModal = ref(false)
const selectedRoom = ref(null)
const passwordInput = ref('')

function handleJoinRoom(room) {
  if (!props.playerName.trim()) {
    alert('Veuillez entrer un nom de joueur')
    return
  }

  if (room.hasPassword) {
    selectedRoom.value = room
    passwordModal.value = true
  } else {
    joinRoom({
      roomId: room.id,
      playerName: props.playerName,
      sessionId: store.sessionId
    })
  }
}

function confirmJoinWithPassword() {
  if (selectedRoom.value) {
    joinRoom({
      roomId: selectedRoom.value.id,
      playerName: props.playerName,
      password: passwordInput.value,
      sessionId: store.sessionId
    })
    closePasswordModal()
  }
}

function closePasswordModal() {
  passwordModal.value = false
  selectedRoom.value = null
  passwordInput.value = ''
}
</script>

<template>
  <div class="room-list">
    <div v-if="rooms.length === 0" class="no-rooms">
      <p>Aucun salon disponible</p>
      <p class="hint">Créez le premier salon !</p>
    </div>

    <div v-else class="rooms">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-item card"
        @click="handleJoinRoom(room)"
      >
        <div class="room-info">
          <div class="room-name">
            <span v-if="room.hasPassword" class="lock-icon">🔒</span>
            {{ room.name }}
          </div>
          <div class="room-meta">
            <span class="badge badge-primary">{{ room.language.toUpperCase() }}</span>
            <span class="badge" :class="room.gameState === 'playing' ? 'badge-success' : 'badge-primary'">
              {{ room.gameState === 'playing' ? 'En cours' : 'En attente' }}
            </span>
          </div>
        </div>
        <div class="room-players">
          <span class="player-count">{{ room.playerCount }}</span>
          <span class="player-label">joueur{{ room.playerCount > 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Modal mot de passe -->
    <div class="modal-overlay" v-if="passwordModal">
      <div class="modal card">
        <h3>Salon protégé</h3>
        <p>Ce salon nécessite un mot de passe</p>
        <div class="form-group">
          <input
            v-model="passwordInput"
            type="password"
            placeholder="Mot de passe"
            @keyup.enter="confirmJoinWithPassword"
          />
        </div>
        <div class="modal-actions">
          <button class="btn-primary" @click="confirmJoinWithPassword">
            Rejoindre
          </button>
          <button class="btn-secondary" @click="closePasswordModal">
            Annuler
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-list {
  min-height: 200px;
}

.no-rooms {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
}

.no-rooms .hint {
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.rooms {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}

.room-item:hover {
  transform: translateX(4px);
  border-color: #667eea;
}

.room-info {
  flex: 1;
}

.room-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.lock-icon {
  margin-right: 0.5rem;
}

.room-meta {
  display: flex;
  gap: 0.5rem;
}

.room-players {
  text-align: center;
  padding-left: 1rem;
}

.player-count {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.player-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  max-width: 350px;
  width: 90%;
}

.modal h3 {
  margin-bottom: 0.5rem;
}

.modal p {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.modal-actions button {
  flex: 1;
}
</style>
