import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module'

@Module({
  imports: [AuthModule, RefreshTokensModule],
})
export class AppModule {}
