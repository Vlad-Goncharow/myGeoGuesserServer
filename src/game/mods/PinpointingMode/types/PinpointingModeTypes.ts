import { BaseGuessPayload, BaseTargetPayload, Coordinates } from 'src/game/types/game'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PinpointingTargetPayload extends BaseTargetPayload {}

export interface PinpointingModeTargetPayload {
  round: number
}

//guesses
export interface PinpointingGuessPayload extends BaseGuessPayload {
  type: string
  coordinates: Coordinates
}
export interface PinpointingModeGuessPayload {
  type: string
  round: number
  userId: number
  coordinates: Coordinates
}
