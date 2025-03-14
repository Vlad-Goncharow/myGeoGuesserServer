import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from 'src/prisma.service'
import { RefreshTokensService } from 'src/refresh-tokens/refresh-tokens.service'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/login-dto.dto'
import { MailService } from 'src/mail/mail.service'
import { GenerateToken } from 'src/types/auth'

@Injectable()
export class AuthService {
  constructor(
    private readonly mailService: MailService,
    private prisma: PrismaService,
    private refreshTokenService: RefreshTokensService,
    private jwtService: JwtService
  ) {}

  async registration(registerDto: RegisterDto) {
    const { email, nickname, password } = registerDto

    const findUser = await this.prisma.user.findFirst({
      where: { OR: [{ nickname }, { email }] },
    })

    if (findUser !== null && findUser.email === email) {
      throw new HttpException(
        { message: 'This email alredy exist', param: 'email' },
        HttpStatus.BAD_REQUEST
      )
    }

    if (findUser !== null && findUser.nickname === nickname) {
      throw new HttpException(
        { message: 'This nickname alredy exist', param: 'nickname' },
        HttpStatus.BAD_REQUEST
      )
    }

    const hashPassword = await bcrypt.hash(password, 5)
    const createUser = await this.prisma.user.create({
      data: {
        ...registerDto,
        password: hashPassword,
      },
    })

    const userWithoutPassword = { ...createUser }
    delete userWithoutPassword.password

    const accessToken = await this.generateToken(userWithoutPassword)
    const generateRefreshToken =
      await this.refreshTokenService.generateRefreshToken(userWithoutPassword)

    const { token } = await this.refreshTokenService.saveToken(
      userWithoutPassword.id,
      generateRefreshToken
    )
    await this.mailService.sendMail(userWithoutPassword)

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken: token,
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto

    const findUser = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!findUser) {
      throw new HttpException(
        { message: 'Email not found', param: 'email' },
        HttpStatus.BAD_REQUEST
      )
    }

    const checkPass = await bcrypt.compare(password, findUser.password)
    if (!checkPass) {
      throw new HttpException(
        { message: 'Wrong password', param: 'password' },
        HttpStatus.BAD_REQUEST
      )
    }

    const userWithoutPassword = { ...findUser }
    delete userWithoutPassword.password

    const accessToken = await this.generateToken(userWithoutPassword)
    const generateRefreshToken =
      await this.refreshTokenService.generateRefreshToken(userWithoutPassword)

    const { token } = await this.refreshTokenService.saveToken(
      userWithoutPassword.id,
      generateRefreshToken
    )

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken: token,
    }
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException()
    }

    const userData = await this.refreshTokenService.validateToken(refreshToken)
    const tokenFromDb = await this.refreshTokenService.findTokenFromDb(refreshToken)

    if (!userData || !tokenFromDb) {
      throw new UnauthorizedException()
    }

    const findUser = await this.prisma.user.findUnique({
      where: { id: userData.id },
    })

    if (!findUser) {
      throw new UnauthorizedException()
    }

    const userWithoutPassword = { ...findUser }
    delete userWithoutPassword.password

    const accessToken = await this.generateToken(userWithoutPassword)
    const generateRefreshToken =
      await this.refreshTokenService.generateRefreshToken(userWithoutPassword)
    const { token } = await this.refreshTokenService.saveToken(
      userWithoutPassword.id,
      generateRefreshToken
    )

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken: token,
    }
  }

  async logout(userId: number) {
    return await this.refreshTokenService.deleteToken(userId)
  }

  async confirmEmail(userId: number) {
    const data = await this.mailService.verifyMail(userId)
    return {
      success: data.success,
    }
  }

  private generateToken(user: GenerateToken) {
    const payload = { email: user.email, id: user.id }

    const access = this.jwtService.sign(payload)
    return access
  }
}
