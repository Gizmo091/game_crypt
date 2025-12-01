import { ref, shallowRef } from 'vue'
import { io } from 'socket.io-client'

const socket = shallowRef(null) // shallowRef pour éviter la réactivité profonde
const isConnected = ref(false)
const rooms = shallowRef([]) // shallowRef pour les rooms aussi
const socketId = ref(null) // Stocker l'ID séparément

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4174'

export function useSocket() {
  function connect() {
    if (socket.value?.connected) return

    socket.value = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      socketId.value = socket.value.id // Stocker l'ID une seule fois
      console.log('Connected to server')
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      socketId.value = null
      console.log('Disconnected from server')
    })

    socket.value.on('room:list-update', (roomList) => {
      // Éviter les mises à jour si les données sont identiques
      if (JSON.stringify(rooms.value) !== JSON.stringify(roomList)) {
        rooms.value = roomList
      }
    })
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  function emit(event, data) {
    if (socket.value) {
      socket.value.emit(event, data)
    }
  }

  function on(event, callback) {
    if (socket.value) {
      socket.value.on(event, callback)
    }
  }

  function off(event, callback) {
    if (socket.value) {
      socket.value.off(event, callback)
    }
  }

  function createRoom(data) {
    emit('room:create', data)
  }

  function joinRoom(data) {
    emit('room:join', data)
  }

  function rejoinRoom(data) {
    emit('room:rejoin', data)
  }

  function leaveRoom() {
    emit('room:leave')
  }

  function startGame() {
    emit('game:start')
  }

  function validatePoint() {
    emit('game:validate-point')
  }

  function skipRound() {
    emit('game:skip')
  }

  function nextRound() {
    emit('game:next-round')
  }

  function endGame() {
    emit('game:end')
  }

  function requestRoomList() {
    emit('room:list')
  }

  function getSocketId() {
    return socketId.value
  }

  return {
    socket,
    isConnected,
    rooms,
    socketId,
    connect,
    disconnect,
    emit,
    on,
    off,
    createRoom,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    startGame,
    validatePoint,
    skipRound,
    nextRound,
    endGame,
    requestRoomList,
    getSocketId
  }
}
