import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { User } from '@prisma/client'
import { v4 as uuid4 } from 'uuid'
import { Server, WebSocket } from 'ws'
import { CountryMode } from './mods/CountryMode/CountryMode'
import { PinpointingMode } from './mods/PinpointingMode/PinpointingMode'
import {
  GuessPayload,
  Room,
  SetTargetCordsType,
  TargetPayload,
  UpdataSettingsPayload,
} from './types/game'
import { CountryGuessPayload, CountryTargetPayload } from './mods/CountryMode/CountryModeTypes'
import {
  PinpointingGuessPayload,
  PinpointingTargetPayload,
} from './mods/PinpointingMode/types/PinpointingModeTypes'

@WebSocketGateway(4000, { cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private rooms: Map<string, Room> = new Map()
  private PinpointingMode = new PinpointingMode()
  private CountryMode = new CountryMode()

  handleConnection(client: WebSocket) {
    client.on('message', (message) => this.onMessage(client, message.toString()))
  }

  onMessage(client: WebSocket, message: string) {
    try {
      const data = JSON.parse(message)
      console.log('Parsed data:', data)

      switch (data.event) {
        case 'joinRoom':
          this.joinRoom(client, data.payload)
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
        case 'endGame':
          this.endGame(client, data.payload)
          break
        case 'setTargetCords':
          this.setTargetCoordinates(client, data.payload)
          break
        case 'setTarget':
          this.setTarget(client, data.payload)
          break
        case 'handleGuess':
          this.handleGuess(client, data.payload)
          break
        case 'endRound':
          this.endRound(client, data.payload)
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

  handleDisconnect(client: WebSocket) {
    console.log('Client disconnected')
    this.rooms.forEach((room) => {
      const user = room.gameState.players.get(client)

      if (user !== undefined && user.id === room.gameState.adminId) {
        this.broadcastToRoom(room, {
          event: 'roomClosed',
          payload: {
            message: 'The admin has left the room. The room is closed.',
          },
        })
        this.rooms.delete(room.gameState.id)
        return
      }

      if (user !== undefined) {
        room.gameState.players.delete(client)
        room.countryMode.guesses = room.countryMode.guesses.filter(
          (guess) => guess.userId !== user.id
        )
        room.poinpointingMode.guesses = room.poinpointingMode.guesses.filter(
          (guess) => guess.userId !== user.id
        )

        this.broadcastToRoom(room, {
          event: 'userLeaveSuccess',
          payload: {
            message: 'A user leaved',
            users: Array.from(room.gameState.players.values()),
            userLeave: user,
          },
        })
      }

      if (room.gameState.players.size === 0) {
        this.rooms.delete(room.gameState.id)
      }
    })
  }

  createRoom(client: WebSocket, admin: number) {
    const roomId = uuid4()

    const defaultSettings = {
      maxPlayers: 5,
      gameMode: 'Pinpointing',
      gameDiffcult: 'Standard Pinpointing',
      roundTime: 180,
      rounds: 5,
    }

    this.rooms.set(roomId, {
      gameState: {
        id: roomId,
        adminId: admin,
        players: new Map(),
        targetCoordinates: new Map(),
        isGameStarted: false,
        isGameEnded: false,
        isRoundStarted: false,
        isRoundEnded: false,
        roundsPlayed: 0,
      },
      settings: defaultSettings,
      countryMode: {
        guesses: [],
        targets: new Map(),
      },
      poinpointingMode: {
        guesses: [],
        targets: new Map(),
      },
    })

    client.send(JSON.stringify({ event: 'roomCreated', payload: { roomId, admin } }))
  }

  joinRoom(client: WebSocket, data: { roomId: string; user: User }) {
    const room = this.findRoom(client, data.roomId)

    if (room.gameState.players.size >= room.settings.maxPlayers) {
      client.send(JSON.stringify({ event: 'error', message: 'Room is full' }))
      return
    }

    room.gameState.players.set(client, data.user)
    const findTargetCords = room.gameState.isGameStarted
      ? room.gameState.targetCoordinates.get(room.gameState.roundsPlayed + 1).coordinates
      : []

    this.broadcastToRoom(room, {
      event: 'newUserJoined',
      payload: {
        message: 'A new user joined',
        users: Array.from(room.gameState.players.values()),
        user: data.user,
        ...room,
        gameState: {
          ...room.gameState,
          targetCoordinates: findTargetCords,
        },
        settings: room.settings,
      },
    })
  }

  updateSettings(client: WebSocket, data: UpdataSettingsPayload) {
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

    this.broadcastToRoom(room, {
      event: 'settingsUpdated',
      payload: {
        settings: room.settings,
      },
    })
  }

  startGame(client: WebSocket, data: { roomId: string }) {
    const room = this.findRoom(client, data.roomId)

    room.gameState.isGameStarted = true

    this.broadcastToRoom(room, {
      event: 'gameStarted',
      payload: {
        isGameStarted: room.gameState.isGameStarted,
      },
    })
  }

  setTargetCoordinates(client: WebSocket, data: SetTargetCordsType) {
    const room = this.findRoom(client, data.roomId)

    room.gameState.targetCoordinates.set(data.round, {
      coordinates: data.cords,
    })

    this.broadcastToRoom(room, {
      event: 'setedTargetCords',
      payload: {
        targetCoordinates: room.gameState.targetCoordinates.get(data.round).coordinates,
      },
    })
  }

  setTarget(client: WebSocket, data: TargetPayload) {
    const room = this.findRoom(client, data.roomId)

    switch (room.settings.gameMode) {
      case 'Pinpointing':
        const pinpointingData = data as PinpointingTargetPayload

        this.PinpointingMode.setTarget(room, { round: pinpointingData.round })
        break
      case 'Country guessr':
        const countryData = data as CountryTargetPayload

        this.CountryMode.setTarget(room, {
          round: countryData.round,
          country: countryData.country,
          code: countryData.code,
        })

        this.broadcastToRoom(room, {
          event: 'setedTargetCountry',
          payload: {
            target: {
              ...room.countryMode.targets.get(countryData.round),
              round: countryData.round,
            },
          },
        })
        this.broadcastToRoom(room, {
          event: 'startedNewRound',
        })
        break
      default:
        client.send(JSON.stringify({ event: 'error', message: 'Unknown game mode' }))
    }
  }

  handleGuess(client: WebSocket, data: GuessPayload) {
    const room = this.findRoom(client, data.roomId);

    switch (room.settings.gameMode) {
      case 'Pinpointing':
        const PinpointingData = data as PinpointingGuessPayload

        const type = this.PinpointingMode.handleGuess(room, {
          type: PinpointingData.type,
          round: PinpointingData.round,
          userId: PinpointingData.userId,
          coordinates: PinpointingData.coordinates,
        })

        this.broadcastToRoom(room, {
          event: type,
          payload: {
            userId: PinpointingData.userId,
          },
        })

        const roundGuesses = room.poinpointingMode.guesses.filter((el) => el.round === data.round)
        if (roundGuesses.length === room.gameState.players.size) {
          this.endRound(client, { roomId: data.roomId, round: data.round })
        }

        break
      case 'Country guessr':
        const CountryData = data as CountryGuessPayload

        this.CountryMode.handleGuess(room, {
          userId: CountryData.userId,
          round: CountryData.round,
          country: CountryData.country,
          time: CountryData.time || null,
          code: CountryData.code,
        })

        this.broadcastToRoom(room, {
          event: 'addedCountryGuess',
          payload: {
            guesses: room.countryMode.guesses.filter((el) => el.round === data.round),
          },
        })

        this.checkCountriesGuesses(client, { roomId: data.roomId, round: data.round })
        break
    }
  }

  endRound(client: WebSocket, data: { round: number; roomId: string }) {
    const room = this.findRoom(client, data.roomId)

    room.gameState.roundsPlayed = room.gameState.roundsPlayed + 1

    switch (room.settings.gameMode) {
      case 'Pinpointing':
        this.broadcastToRoom(room, {
          event: 'endedPoinpointingModeRound',
          payload: {
            roundsPlayed: room.gameState.roundsPlayed,
            guesses: room.poinpointingMode.guesses.filter((el) => el.round === data.round),
          },
        })

        break
      case 'Country guessr':
        this.broadcastToRoom(room, {
          event: 'endCountryModeRound',
          payload: {
            roundsPlayed: data.round,
            guesses: room.countryMode.guesses.filter((el) => el.round === data.round),
          },
        })

        break
    }
  }

  checkCountriesGuesses(client: WebSocket, data: { roomId: string; round: number }) {
    const room = this.findRoom(client, data.roomId)

    const maxGuesses = 3
    let inactivePlayers = 0
    const totalPlayers = room.gameState.players.size

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    room.gameState.players.forEach((user, _) => {
      const userGuesses = room.countryMode.guesses.filter(
        (guess) => guess.userId === user.id && guess.round === data.round
      )

      const hasGuessedCorrectly = userGuesses.some(
        (guess) =>
          guess.country === room.countryMode.targets.get(data.round)?.country &&
          guess.code === room.countryMode.targets.get(data.round)?.code
      )

      const hasNoAttemptsLeft = userGuesses.length >= maxGuesses

      if (hasGuessedCorrectly || hasNoAttemptsLeft) {
        inactivePlayers++
      }
    })

    if (inactivePlayers === totalPlayers) {
      this.endRound(client, { roomId: data.roomId, round: data.round })
    }
  }

  endGame(client: WebSocket, data: { round: number; roomId: string }) {
    const room = this.findRoom(client, data.roomId)

    switch (room.settings.gameMode) {
      case 'Pinpointing':
        const targetCoordinates = this.PinpointingMode.endGame(room)

        this.broadcastToRoom(room, {
          event: 'gameEnded',
          payload: {
            targets: targetCoordinates,
            guesses: room.poinpointingMode.guesses,
          },
        })

        break
      case 'Country guessr':
        const targets = this.CountryMode.endGame(room)

        this.broadcastToRoom(room, {
          event: 'endedCountryModeGame',
          payload: {
            targets,
            guesses: room.countryMode.guesses,
          },
        })

        break
    }
  }

  backToRoom(client: WebSocket, data: { roomId: string }) {
    const room = this.clearRoom(client, data.roomId)

    this.broadcastToRoom(room, {
      event: 'backUsersToRoom',
      payload: {
        room,
      },
    })
  }

  private findRoom(client: WebSocket, roomId: string): Room {
    const room = this.rooms.get(roomId)
    if (!room) {
      client.send(JSON.stringify({ event: 'error', message: 'Room not found' }))
      return
    }

    return room
  }

  private clearRoom(client: WebSocket, roomId: string) {
    const room = this.findRoom(client, roomId)

    room.gameState.isGameEnded = false
    room.gameState.isGameStarted = false
    room.gameState.isRoundEnded = false
    room.gameState.isRoundStarted = false
    room.gameState.roundsPlayed = 0
    room.gameState.targetCoordinates = new Map()

    room.countryMode.guesses = []
    room.countryMode.targets = new Map()
    room.poinpointingMode.guesses = []
    room.poinpointingMode.targets = new Map()

    return room
  }

  private broadcastToRoom(room: Room, message: any) {
    if (!room) return

    room.gameState.players.forEach((_, client) => {
      client.send(JSON.stringify(message))
    })
  }
}
