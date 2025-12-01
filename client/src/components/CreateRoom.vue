<script setup>
import { ref } from 'vue'
import { useSocket } from '../composables/useSocket'
import { useGameStore } from '../stores/gameStore'

const props = defineProps({
  playerName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'created'])

const store = useGameStore()
const { createRoom, on, off } = useSocket()

const roomName = ref('')
const password = ref('')
const language = ref('fr')
const roundTime = ref(90)

function handleCreate() {
  if (!roomName.value.trim()) {
    alert('Veuillez entrer un nom de salon')
    return
  }

  on('room:joined', handleRoomCreated)

  createRoom({
    name: roomName.value.trim(),
    password: password.value || null,
    language: language.value,
    roundTime: roundTime.value,
    playerName: props.playerName,
    sessionId: store.sessionId
  })
}

function handleRoomCreated(data) {
  off('room:joined', handleRoomCreated)
  emit('created', data)
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal card">
      <h2>Créer un salon</h2>

      <div class="form-group">
        <label for="roomName">Nom du salon</label>
        <input
          id="roomName"
          v-model="roomName"
          placeholder="Mon salon..."
          maxlength="30"
        />
      </div>

      <div class="form-group">
        <label for="password">Mot de passe (optionnel)</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Laisser vide pour un salon public"
        />
      </div>

      <div class="form-group">
        <label for="language">Langue</label>
        <select id="language" v-model="language">
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <div class="form-group">
        <label for="roundTime">Temps par manche : {{ roundTime }}s</label>
        <input
          id="roundTime"
          type="range"
          v-model.number="roundTime"
          min="30"
          max="180"
          step="10"
        />
        <div class="range-labels">
          <span>30s</span>
          <span>180s</span>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="handleCreate">
          Créer
        </button>
        <button class="btn-secondary" @click="handleClose">
          Annuler
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  max-width: 400px;
  width: 90%;
}

.modal h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}

input[type="range"] {
  width: 100%;
  padding: 0;
  background: transparent;
  -webkit-appearance: none;
}

input[type="range"]::-webkit-slider-track {
  height: 6px;
  border-radius: 3px;
  background: #2d2d44;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  margin-top: -7px;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions button {
  flex: 1;
}
</style>
