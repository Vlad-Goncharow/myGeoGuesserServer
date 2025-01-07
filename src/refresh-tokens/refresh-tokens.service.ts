import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'src/prisma.service'
import { User } from '@prisma/client'

@Injectable()
export class RefreshTokensService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // Генерация нового рефреш-токена
  async generateRefreshToken(user: User) {
    const payload = { email: user.email, id: user.id }
    const refresh = this.jwtService.sign(payload)

    return refresh
  }

  // Сохранение или обновление рефреш-токена в базе данных
  async saveToken(userId: number, token: string) {
    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { userId },
    })

    if (existingToken) {
      existingToken.token = token
      return this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { token },
      })
    }

    const refreshToken = await this.prisma.refreshToken.create({
      data: { userId, token },
    })

    return refreshToken
  }

  // Удаление рефреш-токена из базы данных
  async deleteToken(userId: number) {
    const token = await this.prisma.refreshToken.findFirst({
      where: { userId },
    })

    if (!token) {
      throw new HttpException('Токен не найден', HttpStatus.NOT_FOUND)
    }

    await this.prisma.refreshToken.delete({
      where: { id: token.id },
    })

    return {
      success: true,
    }
  }

  // Валидация рефреш-токена
  async validateToken(refreshToken: string) {
    try {
      const userData = this.jwtService.verify(refreshToken)
      return userData
    } catch (e: any) {
      console.error(e)
      throw new HttpException('Невалидный токен', HttpStatus.UNAUTHORIZED)
    }
  }

  // Поиск токена в базе данных по строке токена
  async findTokenFromDb(refreshToken: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!token) {
      throw new HttpException('Токен не найден', HttpStatus.NOT_FOUND)
    }

    return token
  }
}
