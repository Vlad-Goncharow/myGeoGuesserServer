import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { join } from 'path'
import { User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class MailService {
  constructor(
    private prisma: PrismaService,
    private readonly mailerService: MailerService
  ) {}

  async sendMail(user: User) {
    const urlConfirmAddress = process.env.URL_CONFIRM_ADDRESS

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Confirmation Email',
        from: 'vladuska159@gmail.com',
        template: join(__dirname, '/../templates', 'confirmRegister'),
        context: {
          id: user.id,
          username: user.nickname,
          urlConfirmAddress,
        },
      })

      return {
        success: true,
      }
    } catch (err) {
      throw err
    }
  }

  async verifyMail(id: number) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          isActive: true,
        },
      })

      return {
        success: true,
      }
    } catch (e) {
      throw e
    }
  }
}
