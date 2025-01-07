import { Module } from '@nestjs/common'
import { RefreshTokensService } from './refresh-tokens.service'
import { RefreshTokensController } from './refresh-tokens.controller'
import { JwtModule } from '@nestjs/jwt'
import { PrismaService } from 'src/prisma.service'

@Module({
  controllers: [RefreshTokensController],
  providers: [RefreshTokensService, PrismaService],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_REFRESH_SECRET_REFRESH || 'SECRET',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
