import { Room } from 'src/game/types/game'
import {
  PinpointingModeGuessPayload,
  PinpointingModeTargetPayload,
} from './types/PinpointingModeTypes'

export class PinpointingMode {
  setTarget(room: Room, data: PinpointingModeTargetPayload): void {
    room.pinpointingMode.targets.set(data.round, {
      coordinates: room.gameState.targetCoordinates.get(data.round).coordinates,
    })
  }

  handleGuess(room: Room, data: PinpointingModeGuessPayload): string {
    if (data.type === 'finishGuess') {
      room.pinpointingMode.guesses.push({
        userId: data.userId,
        round: data.round,
        coordinates: data.coordinates,
      })

      return 'playerFinishGuess'
    }

    if (data.type === 'unFinishGuess') {
      room.pinpointingMode.guesses = room.pinpointingMode.guesses.filter(
        (guess) => !(guess.userId === data.userId && guess.round === data.round)
      )

      return 'playerUnFinishGuess'
    }
  }

  endGame(room: Room) {
    return Array.from(room.pinpointingMode.targets.entries()).map(([round, value]) => ({
      round,
      ...value,
    }))
  }
}
