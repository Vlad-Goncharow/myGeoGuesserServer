import { Room } from 'src/game/types/game'
import {
  PinpointingModeGuessPayload,
  PinpointingModeTargetPayload,
} from './types/PinpointingModeTypes'

export class PinpointingMode {
  setTarget(room: Room, data: PinpointingModeTargetPayload): void {
    room.poinpointingMode.targets.set(data.round, {
      coordinates: room.gameState.targetCoordinates.get(data.round).coordinates,
    })
  }

  handleGuess(room: Room, data: PinpointingModeGuessPayload): string {
    if (data.type === 'finishGuess') {
      room.poinpointingMode.guesses.push({
        userId: data.userId,
        round: data.round,
        coordinates: data.coordinates,
      })

      return 'playerFinishGuess'
    }

    if (data.type === 'unFinishGuess') {
      room.poinpointingMode.guesses = room.poinpointingMode.guesses.filter(
        (guess) => !(guess.userId === data.userId && guess.round === data.round)
      )

      return 'playerUnFinishGuess'
    }
  }

  endGame(room: Room) {
    return Array.from(room.poinpointingMode.targets.entries()).map(([round, value]) => ({
      round,
      ...value,
    }))
  }
}
