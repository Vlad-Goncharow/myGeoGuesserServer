import { Room } from 'src/game/types/game'
import { CountryModeGuessPayload, CountryModeTargetPayload } from './CountryModeTypes'

export class CountryMode {
  setTarget(room: Room, data: CountryModeTargetPayload): void {
    room.countryMode.targets.set(data.round, {
      country: data.country,
      code: data.code,
    })
  }

  handleGuess(room: Room, data: CountryModeGuessPayload): void {
    room.countryMode.guesses.push({
      userId: data.userId,
      round: data.round,
      country: data.country,
      time: data.time,
      code: data.code,
    })
  }

  endGame(room: Room) {
    return Array.from(room.countryMode.targets.entries()).map(([round, value]) => ({
      round,
      ...value,
    }))
  }
}
