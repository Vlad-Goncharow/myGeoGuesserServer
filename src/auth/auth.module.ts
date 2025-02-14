import { forwardRef, Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { PrismaService } from 'src/prisma.service'
import { JwtModule } from '@nestjs/jwt'
import { RefreshTokensModule } from 'src/refresh-tokens/refresh-tokens.module'
import { MailModule } from 'src/mail/mail.module'
import { UsersModule } from 'src/users/users.module'

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_REFRESH_SECRET_ACCESS || 'SECRET',
      signOptions: {
        expiresIn: '24h',
      },
    }),
    RefreshTokensModule,
    MailModule,
    forwardRef(() => UsersModule),
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
