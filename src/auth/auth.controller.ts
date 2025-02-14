import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/login-dto.dto'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CustomRequest } from 'src/types/auth'
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

  @Render('confirmEmail')
  @Get('/confirm/:userId')
  async confirmEmail(@Param('userId', ParseIntPipe) userId: number) {
    const data = await this.authService.confirmEmail(userId)
    return {
      success: data.success,
    }
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
