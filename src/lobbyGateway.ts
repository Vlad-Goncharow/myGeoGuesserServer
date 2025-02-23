import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets'
import { Server, WebSocket } from 'ws'
import { v4 as uuid4 } from 'uuid'
import { User } from '@prisma/client'

interface Room {
  id: string
  admin: number
  clients: Map<WebSocket, User>
  isGameStarted: boolean
  isGameEnded: boolean
  roundsPlayed: number
  guessComplited: number
  targetCoordinates: Map<number, { coordinates: { lat: number; lng: number } }>
  settings: {
    maxPlayers: number
    gameMode: string
    gameDiffcult: string
    roundTime: number
    rounds: number
  }
  guesses: { userId: number; round: number; coordinates: { lat: number; lng: number } }[]
  targetCountries: Map<number, { country: string; code: string }>
  selectedCountries: {
    userId: number
    round: number
    country: string
    time: number | null
    code: string
  }[]
}

@WebSocketGateway(4000, { cors: { origin: '*' } })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private rooms: Map<string, Room> = new Map()

  handleConnection(client: WebSocket) {
    client.on('message', (message) => this.onMessage(client, message.toString()))
  }

  handleDisconnect(client: WebSocket) {
    console.log('Client disconnected')
    this.rooms.forEach((room) => {
      const user = room.clients.get(client)

      if (user !== undefined && user.id === room.admin) {
        this.broadcastToRoom(room.id, {
          event: 'roomClosed',
          payload: {
            message: 'The admin has left the room. The room is closed.',
          },
        })
        this.rooms.delete(room.id)
        return
      }

      if (user !== undefined) {
        room.clients.delete(client)
        room.guesses = room.guesses.filter((guess) => guess.userId !== user.id)
        this.broadcastToRoom(room.id, {
          event: 'userLeaveSuccess',
          payload: {
            message: 'A user leaved',
            users: Array.from(room.clients.values()),
            userLeave: user,
          },
        })
      }

      if (room.clients.size === 0) {
        this.rooms.delete(room.id)
      }
    })
  }

  onMessage(client: WebSocket, message: string) {
    try {
      const data = JSON.parse(message)
      console.log('Parsed data:', data)

      switch (data.event) {
        case 'joinRoom':
          this.joinRoom(client, data.payload.roomId, data.payload.user)
          break
        case 'updateSettings':
          this.updateSettings(client, data.payload)
          break
        case 'createRoom':
          this.createRoom(client, data.admin)
          break
        case 'startGame':
          this.startGame(client, data.payload)
          break
        case 'gameEnd':
          this.endGame(client, data.payload)
          break
        case 'finishGuess':
          this.finishGuess(client, data.payload)
          break
        case 'addCountryGuess':
          this.addCountryGuess(client, data.payload)
          break
        case 'endCountryModeRound':
          this.endCountryModeRound(data.payload)
          break
        case 'startNewRound':
          this.startNewRound(client, data.payload)
          break
        case 'setTargetCords':
          this.setTargetCoordinates(client, data.payload)
          break
        case 'setTargetCountry':
          this.setTargetCountry(client, data.payload)
          break
        case 'endCountyModeGame':
          this.endCountyModeGame(client, data.payload)
          break
        case 'userLeave':
          this.userLeave(client, data.payload)
          break
        case 'backToRoom':
          this.backToRoom(client, data.payload)
          break
      }
    } catch (error) {
      console.error('Error parsing message:', error)
      client.send(JSON.stringify({ event: 'error', message: 'Invalid JSON format' }))
    }
  }

  createRoom(client: WebSocket, admin: number) {
    const roomId = uuid4()
    console.log('Creating room with ID:', roomId)

    const defaultSettings = {
      maxPlayers: 5,
      gameMode: 'Pinpointing',
      gameDiffcult: 'Standard Pinpointing',
      roundTime: 180,
      rounds: 5,
    }

    this.rooms.set(roomId, {
      id: roomId,
      admin,
      clients: new Map(),
      settings: defaultSettings,
      isGameStarted: false,
      isGameEnded: false,
      roundsPlayed: 0,
      guessComplited: 0,
      targetCoordinates: new Map(),
      targetCountries: new Map(),
      guesses: [],
      selectedCountries: [],
    })

    client.send(JSON.stringify({ event: 'roomCreated', payload: { roomId, admin } }))
  }

  joinRoom(client: WebSocket, roomId: string, user: User) {
    const room = this.rooms.get(roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    if (room.clients.size >= room.settings.maxPlayers) {
      client.send(JSON.stringify({ event: 'error', message: 'Room is full' }))
      return
    }

    room.clients.set(client, user)
    const findTargetCords = room.isGameStarted
      ? room.targetCoordinates.get(room.roundsPlayed + 1).coordinates
      : []

    this.broadcastToRoom(roomId, {
      event: 'newUserJoined',
      payload: {
        message: 'A new user joined',
        users: Array.from(room.clients.values()),
        user,
        ...room,
        targetCoordinates: findTargetCords,
        settings: room.settings,
        admin: room.admin,
      },
    })
  }

  updateSettings(client: WebSocket, data: { roomId: any; settings: any }) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    const updatedSettings = {
      ...room.settings,
      ...data.settings,
    }

    room.settings = updatedSettings

    this.broadcastToRoom(data.roomId, {
      event: 'settingsUpdated',
      payload: {
        settings: room.settings,
      },
    })
  }

  @SubscribeMessage('getRoomUsers')
  getRoomUsers(client: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    const users = Array.from(room.clients.values())

    client.send(
      JSON.stringify({
        event: 'roomUsers',
        payload: users,
      })
    )
  }

  startGame(client: WebSocket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    room.isGameStarted = true

    this.broadcastToRoom(data.roomId, {
      event: 'gameStarted',
      payload: {
        isGameStarted: room.isGameStarted,
      },
    })
  }

  endGame(client: WebSocket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    room.isGameStarted = true
    room.isGameEnded = true

    const targetCoordinates = Array.from(room.targetCoordinates.entries()).map(
      ([round, value]) => ({
        round,
        ...value,
      })
    )

    this.broadcastToRoom(data.roomId, {
      event: 'gameEnded',
      payload: {
        targetCoordinates,
        guesses: room.guesses,
      },
    })
  }

  finishGuess(
    client: WebSocket,
    data: {
      roomId: string
      round: number
      type: string
      userId: number
      coordinates: { lat: number; lng: number }
    }
  ) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    if (data.type === 'finishGuess') {
      room.guessComplited = room.guessComplited + 1
      room.guesses.push({
        userId: data.userId,
        round: data.round,
        coordinates: data.coordinates,
      })

      this.broadcastToRoom(data.roomId, {
        event: 'playerFinishGuess',
        payload: {
          userId: data.userId,
        },
      })
    }

    if (data.type === 'unFinishGuess') {
      room.guessComplited = room.guessComplited - 1

      room.guesses = room.guesses.filter(
        (guess) => !(guess.userId === data.userId && guess.round === data.round)
      )

      this.broadcastToRoom(data.roomId, {
        event: 'playerUnFinishGuess',
        payload: {
          userId: data.userId,
        },
      })
    }

    if (room.guessComplited === room.clients.size) {
      room.roundsPlayed = room.roundsPlayed + 1
      room.guessComplited = 0

      this.broadcastToRoom(data.roomId, {
        event: 'allPlayersFinished',
        payload: {
          roundsPlayed: room.roundsPlayed,
          guesses: room.guesses.filter((el) => el.round === data.round),
        },
      })
    }
  }

  addCountryGuess(
    client: WebSocket,
    data: {
      roomId: string
      round: number
      userId: number
      country: string
      time: number | null
      code: string
    }
  ) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    if (data.country === room.targetCountries.get(data.round).country) {
      room.guessComplited = room.guessComplited + 1
    }

    room.selectedCountries.push({
      userId: data.userId,
      round: data.round,
      country: data.country,
      time: data.time,
      code: data.code,
    })

    this.broadcastToRoom(data.roomId, {
      event: 'addedCountryGuess',
      payload: {
        selectedCountries: room.selectedCountries.filter((el) => el.round === data.round),
      },
    })
    this.checkRoundEnd(data.roomId, data.round)
  }
  checkRoundEnd(roomId: string, round: number) {
    const room = this.rooms.get(roomId)
    if (!room) return

    const maxGuesses = 3
    let inactivePlayers = 0
    const totalPlayers = room.clients.size

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    room.clients.forEach((user, _) => {
      const userGuesses = room.selectedCountries.filter(
        (guess) => guess.userId === user.id && guess.round === round
      )

      const hasGuessedCorrectly = userGuesses.some(
        (guess) =>
          guess.country === room.targetCountries.get(round)?.country &&
          guess.code === room.targetCountries.get(round)?.code
      )

      const hasNoAttemptsLeft = userGuesses.length >= maxGuesses

      if (hasGuessedCorrectly || hasNoAttemptsLeft) {
        inactivePlayers++
      }
    })

    if (inactivePlayers === totalPlayers) {
      this.endCountryModeRound({ roomId, round })
    }
  }

  endCountryModeRound(data: { roomId: string; round: number }) {
    const room = this.rooms.get(data.roomId)
    if (!room) return

    this.broadcastToRoom(data.roomId, {
      event: 'endCountryModeRound',
      payload: {
        roundsPlayed: data.round,
        selectedCountries: room.selectedCountries.filter((el) => el.round === data.round),
      },
    })

    room.guessComplited = 0
  }
  endCountyModeGame(client: WebSocket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    const targetCountries = Array.from(room.targetCountries.entries()).map(([round, value]) => ({
      round,
      ...value,
    }))

    this.broadcastToRoom(data.roomId, {
      event: 'endedCountryModeGame',
      payload: {
        targetCountries,
        selectedCountries: room.selectedCountries,
      },
    })

    room.guessComplited = 0
  }

  startNewRound(client: WebSocket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    this.broadcastToRoom(data.roomId, {
      event: 'newRoundStarted',
      payload: {
        roundsPlayed: room.roundsPlayed,
      },
    })
  }

  setTargetCoordinates(client: WebSocket, data: { roomId: string; cords: any; round: number }) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    room.targetCoordinates.set(data.round, {
      coordinates: data.cords,
    })

    this.broadcastToRoom(data.roomId, {
      event: 'setedTargetCords',
      payload: {
        targetCoordinates: room.targetCoordinates.get(data.round).coordinates,
      },
    })
  }

  setTargetCountry(
    client: WebSocket,
    data: { roomId: string; country: string; round: number; code: string }
  ) {
    const room = this.rooms.get(data.roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    room.targetCountries.set(data.round, {
      country: data.country,
      code: data.code,
    })

    this.broadcastToRoom(data.roomId, {
      event: 'setedTargetCountry',
      payload: {
        targetCountries: { ...room.targetCountries.get(data.round), round: data.round },
      },
    })
    this.broadcastToRoom(data.roomId, {
      event: 'startedNewRound',
    })
  }

  userLeave(client: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    this.rooms.forEach((room) => {
      room.clients.delete(client)
      if (room.clients.size === 0) {
        this.rooms.delete(room.id)
      }
    })

    this.broadcastToRoom(roomId, {
      event: 'userLeaveSuccess',
      payload: {
        message: 'A user leaved',
        users: Array.from(room.clients.values()),
      },
    })
  }

  backToRoom(client: WebSocket, data: { roomId: string }) {
    const room = this.clearRoom(client, data.roomId)

    this.broadcastToRoom(data.roomId, {
      event: 'backUsersToRoom',
      payload: {
        room,
      },
    })
  }

  private clearRoom(client: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId)

    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    room.guessComplited = 0
    room.guesses = []
    room.isGameEnded = false
    room.isGameStarted = false
    room.roundsPlayed = 0
    room.targetCoordinates = new Map()
    room.targetCountries = new Map()
    room.selectedCountries = []

    return room
  }
  private broadcastToRoom(roomId: string, message: any) {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.clients.forEach((_, client) => {
      client.send(JSON.stringify(message))
    })
  }
}
