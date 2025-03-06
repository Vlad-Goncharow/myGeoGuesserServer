import { User } from '@prisma/client'
import { CountryGuessPayload, CountryTargetPayload } from '../mods/CountryMode/CountryModeTypes'
import {
  PinpointingGuessPayload,
  PinpointingTargetPayload,
} from '../mods/PinpointingMode/types/PinpointingModeTypes'

export interface Room {
  gameState: {
    id: string
    adminId: number
    isGameStarted: boolean
    isGameEnded: boolean
    isRoundStarted: boolean
    isRoundEnded: boolean
    roundsPlayed: number
    players: Map<WebSocket, User>
    targetCoordinates: Map<number, { coordinates: Coordinates }>
  }
  settings: SettingsTypes
  countryMode: {
    targets: Map<number, { country: string; code: string }>
    guesses: {
      userId: number
      round: number
      country: string
      time: number | null
      code: string
    }[]
  }
  poinpointingMode: {
    targets: Map<number, { coordinates: { lat: number; lng: number } }>
    guesses: {
      userId: number
      round: number
      coordinates: { lat: number; lng: number }
    }[]
  }
}
interface SettingsTypes {
  gameMode: string
  gameDifficulty?: string
  roundTime: number
  rounds: number
  maxPlayers: number
}

export interface Coordinates {
  lat: number
  lng: number
}

//updateSettings
export interface UpdataSettingsPayload {
  roomId: string
  settings: SettingsTypes
}

//setTargetCoordinates
export interface SetTargetCordsType {
  roomId: string
  cords: Coordinates
  round: number
}

//setTarget
export interface BaseTargetPayload {
  roomId: string
  round: number
}
export type TargetPayload = PinpointingTargetPayload | CountryTargetPayload

//guesses
export interface BaseGuessPayload {
  roomId: string
  round: number
  userId: number
}
export type GuessPayload = PinpointingGuessPayload | CountryGuessPayload
