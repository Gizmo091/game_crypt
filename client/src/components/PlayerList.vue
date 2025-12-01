<script setup>
import { useSocket } from '../composables/useSocket'

const { socketId } = useSocket()

defineProps({
  players: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <div class="player-list">
    <div
      v-for="player in players"
      :key="player.id"
      class="player-item"
      :class="{ manager: player.isManager, me: player.id === socketId }"
    >
      <div class="player-info">
        <span v-if="player.id === socketId" class="me-badge" title="C'est vous">👤</span>
        <span v-if="player.isManager" class="manager-badge" title="Manager">⭐</span>
        <span class="player-name">{{ player.name }}</span>
      </div>
      <span v-if="player.score > 0" class="player-score">
        {{ player.score }} pt{{ player.score > 1 ? 's' : '' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: background 0.2s;
}

.player-item.manager {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.player-item.me {
  border-left: 3px solid #667eea;
}

.player-item.me .player-name {
  font-weight: 600;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.manager-badge,
.me-badge {
  font-size: 1rem;
}

.player-name {
  font-weight: 500;
}

.player-score {
  color: #38ef7d;
  font-weight: 600;
}
</style>
