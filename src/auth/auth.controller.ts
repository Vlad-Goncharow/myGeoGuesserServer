import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/login-dto.dto'
import { JwtAuthGuard } from './jwt-auth.guard'
import { User } from '@prisma/client'

export interface CustomRequest extends Request {
  cookies: Record<string, string>
  user: User
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  async registration(@Res() res: Response, @Body() RegisterDto: RegisterDto) {
    const data = await this.authService.registration(RegisterDto)

    res.cookie('refreshToken', data.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    })

    return res.json(data)
  }

  @Post('/login')
  async login(@Res() res: Response, @Body() LoginDto: LoginDto) {
    const data = await this.authService.login(LoginDto)

    res.cookie('refreshToken', data.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    })

    return res.json(data)
  }

  @Post('/logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: CustomRequest, @Res() res: Response) {
    const { id } = req.user
    const userData = await this.authService.logout(id)

    res.clearCookie('refreshToken')
    res.json(userData)
  }

  @Post('/refresh')
  async refresh(@Req() req: CustomRequest, @Res() res: Response) {
    const { refreshToken } = req.cookies

    const data = await this.authService.refresh(refreshToken)
    res.cookie('refreshToken', data.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    })

    return res.json(data)
  }
}
