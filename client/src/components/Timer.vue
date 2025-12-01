<script setup>
import { computed } from 'vue'

const props = defineProps({
  time: {
    type: Number,
    default: 0
  }
})

const formattedTime = computed(() => {
  const minutes = Math.floor(props.time / 60)
  const seconds = props.time % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isLow = computed(() => props.time <= 10)
const isCritical = computed(() => props.time <= 5)
</script>

<template>
  <div class="timer" :class="{ low: isLow, critical: isCritical }">
    <div class="timer-inner">
      <span class="timer-value">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<style scoped>
.timer {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 4px;
  transition: all 0.3s;
}

.timer.low {
  background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
}

.timer.critical {
  background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.timer-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-value {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
