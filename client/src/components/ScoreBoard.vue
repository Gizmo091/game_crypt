<script setup>
import { computed } from 'vue'
import { useSocket } from '../composables/useSocket'

const { socketId } = useSocket()

const props = defineProps({
  players: {
    type: Array,
    default: () => []
  },
  currentGuesserId: {
    type: String,
    default: null
  }
})

const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => b.score - a.score)
})
</script>

<template>
  <div class="scoreboard card">
    <h3>Scores</h3>
    <div class="scores">
      <div
        v-for="(player, index) in sortedPlayers"
        :key="player.id"
        class="score-item"
        :class="{
          first: index === 0 && player.score > 0,
          guesser: player.id === currentGuesserId,
          me: player.id === socketId
        }"
      >
        <div class="player-info">
          <span class="rank">{{ index + 1 }}</span>
          <span class="name">{{ player.name }}</span>
          <span v-if="player.id === socketId" class="me-badge" title="C'est vous">👤</span>
          <span v-if="player.isManager" class="manager-icon" title="Manager">⭐</span>
          <span v-if="player.id === currentGuesserId" class="guesser-badge" title="Devine">🎯</span>
        </div>
        <span class="score">{{ player.score }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard h3 {
  margin-bottom: 1rem;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.6);
}

.scores {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.2s;
}

.score-item.first {
  background: rgba(56, 239, 125, 0.1);
  border: 1px solid rgba(56, 239, 125, 0.3);
}

.score-item.guesser {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.score-item.me {
  border-left: 3px solid #667eea;
}

.score-item.me .name {
  font-weight: 600;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.rank {
  width: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

.name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.manager-icon,
.guesser-badge,
.me-badge {
  font-size: 0.875rem;
}

.score {
  font-weight: 700;
  font-size: 1.1rem;
  color: #38ef7d;
  margin-left: 0.5rem;
}
</style>
