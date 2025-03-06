import { BaseGuessPayload, BaseTargetPayload } from 'src/game/types/game'

export interface CountryTargetPayload extends BaseTargetPayload {
  country: string
  code: string
}
export interface CountryModeTargetPayload {
  round: number
  country: string
  code: string
}

//guesses
export interface CountryGuessPayload extends BaseGuessPayload {
  country: string
  code: string
  time?: number
}
export interface CountryModeGuessPayload {
  userId: number
  round: number
  country: string
  code: string
  time?: number | null
}
