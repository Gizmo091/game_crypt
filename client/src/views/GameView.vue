<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSocket } from '../composables/useSocket'
import { useGameStore } from '../stores/gameStore'
import Timer from '../components/Timer.vue'
import ScoreBoard from '../components/ScoreBoard.vue'

const router = useRouter()
const route = useRoute()
const store = useGameStore()
const { on, off, leaveRoom, validatePoint, skipRound, nextRound, endGame } = useSocket()

const isLoading = ref(true)
const showEndModal = ref(false)
const winner = ref(null)
const lastPhrase = ref(null)
const betweenRounds = ref(false)
const nextGuesser = ref(null)

const guesserName = computed(() => {
  if (!store.currentRound) return ''
  const guesser = store.players.find(p => p.id === store.currentRound.guesserId)
  return guesser?.name || 'Inconnu'
})

function handleRound(data) {
  store.setRound(data)
  betweenRounds.value = false
  nextGuesser.value = null
}

function handleTimer(data) {
  store.setTimeRemaining(data.timeRemaining)
}

function handlePointAwarded(data) {
  store.updatePlayerScores(data.players)
}

function handleRoundEnd(data) {
  store.updatePlayerScores(data.players)
  lastPhrase.value = data.phrase
  betweenRounds.value = true
  nextGuesser.value = data.nextGuesser
}

function handleNextRound() {
  nextRound()
}

function handleGameEnded(data) {
  winner.value = data.winner
  store.updatePlayerScores(data.players)
  showEndModal.value = true
}

function handleLeaveRoom() {
  leaveRoom()
  store.reset()
  router.push('/')
}

function handleBackToLobby() {
  showEndModal.value = false
  store.setGameState('waiting')
  router.push(`/lobby/${route.params.roomId}`)
}

onMounted(() => {
  on('game:round', handleRound)
  on('game:timer', handleTimer)
  on('game:point-awarded', handlePointAwarded)
  on('game:round-end', handleRoundEnd)
  on('game:ended', handleGameEnded)

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
  off('game:round', handleRound)
  off('game:timer', handleTimer)
  off('game:point-awarded', handlePointAwarded)
  off('game:round-end', handleRoundEnd)
  off('game:ended', handleGameEnded)
})
</script>

<template>
  <div class="game" v-if="store.currentRoom">
    <div class="game-header">
      <Timer :time="store.timeRemaining" />
    </div>

    <div class="game-content">
      <div class="game-main">
        <!-- Écran entre les manches -->
        <template v-if="betweenRounds">
          <div class="between-rounds card">
            <h2>Manche terminée !</h2>

            <div class="round-result" v-if="lastPhrase">
              <p>La réponse était :</p>
              <p class="phrase-answer">{{ lastPhrase.original }}</p>
              <p class="coded">Codé : {{ lastPhrase.coded }}</p>
            </div>

            <div class="next-guesser" v-if="nextGuesser">
              <p>Prochain à deviner :</p>
              <p class="next-guesser-name">{{ nextGuesser.name }}</p>
            </div>

            <div class="between-rounds-actions" v-if="store.isManager">
              <button class="btn-primary btn-large" @click="handleNextRound">
                Manche suivante
              </button>
              <button class="btn-danger" @click="endGame">
                Terminer la partie
              </button>
            </div>
            <div class="waiting-message" v-else>
              <p>En attente du manager...</p>
            </div>
          </div>
        </template>

        <!-- Écran de jeu normal -->
        <template v-else>
          <div class="role-indicator" :class="{ guesser: store.isGuesser }">
            {{ store.isGuesser ? 'Vous devinez !' : 'Aidez le devineur !' }}
          </div>

          <div class="guesser-info" v-if="!store.isGuesser">
            <strong>{{ guesserName }}</strong> doit deviner
          </div>

          <div class="phrase-container card">
            <h3>{{ store.isGuesser ? 'Phrase codée' : 'Phrase originale' }}</h3>
            <p class="phrase">{{ store.phrase }}</p>
          </div>

          <div class="manager-controls" v-if="store.isManager">
            <button class="btn-success" @click="validatePoint">
              Valider le point
            </button>
            <button class="btn-secondary" @click="skipRound">
              Passer
            </button>
            <button class="btn-danger" @click="endGame">
              Terminer la partie
            </button>
          </div>
        </template>
      </div>

      <div class="game-sidebar">
        <ScoreBoard :players="store.players" :currentGuesserId="store.currentRound?.guesserId" />
        <button class="btn-leave" @click="handleLeaveRoom">
          Quitter la partie
        </button>
      </div>
    </div>

    <!-- Modal de fin de partie -->
    <div class="modal-overlay" v-if="showEndModal">
      <div class="modal card">
        <h2>Partie terminée !</h2>
        <div class="winner" v-if="winner">
          <p>Gagnant :</p>
          <h3>{{ winner.name }}</h3>
          <p class="score">{{ winner.score }} points</p>
        </div>
        <div class="final-scores">
          <h4>Scores finaux</h4>
          <ScoreBoard :players="store.players" />
        </div>
        <div class="modal-actions">
          <button class="btn-primary" @click="handleBackToLobby">
            Retour au lobby
          </button>
          <button class="btn-secondary" @click="handleLeaveRoom">
            Quitter
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="isLoading" class="loading">
    <p>Reconnexion en cours...</p>
  </div>
</template>

<style scoped>
.game {
  max-width: 1000px;
  margin: 0 auto;
}

.game-header {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.game-content {
  display: grid;
  grid-template-columns: 1fr 250px;
  gap: 2rem;
}

.game-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-indicator {
  text-align: center;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1.25rem;
  font-weight: 600;
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.role-indicator.guesser {
  background: rgba(56, 239, 125, 0.2);
  color: #38ef7d;
}

.guesser-info {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.phrase-container {
  text-align: center;
}

.phrase-container h3 {
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.phrase {
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.4;
  color: white;
  margin: 0;
}

.between-rounds {
  text-align: center;
  padding: 2rem;
}

.between-rounds h2 {
  margin-bottom: 1.5rem;
  color: #38ef7d;
}

.round-result {
  margin-bottom: 2rem;
}

.round-result p {
  margin: 0.5rem 0;
  color: rgba(255, 255, 255, 0.7);
}

.phrase-answer {
  font-size: 1.5rem;
  font-weight: 600;
  color: white !important;
  margin: 1rem 0 !important;
}

.round-result .coded {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.next-guesser {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 8px;
}

.next-guesser p {
  margin: 0.5rem 0;
  color: rgba(255, 255, 255, 0.7);
}

.next-guesser-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: #667eea !important;
  margin: 0.5rem 0 !important;
}

.between-rounds-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.waiting-message {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.manager-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.game-sidebar {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-leave {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  border: 1px solid rgba(255, 100, 100, 0.5);
  color: rgba(255, 100, 100, 0.8);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-leave:hover {
  background: rgba(255, 100, 100, 0.1);
  border-color: rgba(255, 100, 100, 0.8);
  color: #ff6464;
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
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.winner {
  margin-bottom: 1.5rem;
}

.winner h3 {
  font-size: 1.5rem;
  color: #38ef7d;
  margin: 0.5rem 0;
}

.winner .score {
  color: rgba(255, 255, 255, 0.7);
}

.final-scores {
  margin-bottom: 1.5rem;
}

.final-scores h4 {
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 768px) {
  .game-content {
    grid-template-columns: 1fr;
  }

  .phrase {
    font-size: 1.5rem;
  }
}
</style>
