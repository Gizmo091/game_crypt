import { ref } from 'vue'
import { io } from 'socket.io-client'

let socketInstance = null // Socket hors réactivité Vue
const isConnected = ref(false)
const rooms = ref([])
const socketId = ref(null)

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4174'

export function useSocket() {
  function connect() {
    // Éviter les connexions multiples
    if (socketInstance?.connected) return
    if (socketInstance) {
      socketInstance.removeAllListeners()
      socketInstance.disconnect()
    }

    socketInstance = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    })

    socketInstance.on('connect', () => {
      isConnected.value = true
      socketId.value = socketInstance.id
      console.log('Connected to server')
    })

    socketInstance.on('disconnect', () => {
      isConnected.value = false
      socketId.value = null
      console.log('Disconnected from server')
    })

    socketInstance.on('room:list-update', (roomList) => {
      rooms.value = roomList
    })
  }

  function disconnect() {
    if (socketInstance) {
      socketInstance.removeAllListeners()
      socketInstance.disconnect()
      socketInstance = null
      isConnected.value = false
      socketId.value = null
    }
  }

  function emit(event, data) {
    if (socketInstance) {
      socketInstance.emit(event, data)
    }
  }

  function on(event, callback) {
    if (socketInstance) {
      socketInstance.on(event, callback)
    }
  }

  function off(event, callback) {
    if (socketInstance) {
      socketInstance.off(event, callback)
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
