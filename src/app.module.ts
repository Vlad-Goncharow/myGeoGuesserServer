import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module'
import { ServeStaticModule } from '@nestjs/serve-static'
import { MailModule } from './mail/mail.module'
import * as path from 'path'
import { MailerModule } from '@nestjs-modules/mailer'
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter'
import { LobbyGateway } from './lobbyGateway'
import { UsersModule } from './users/users.module'
import { FilesModule } from './files/files.module'

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'vladuska159@gmail.com',
          pass: 'tcxf djtt frpv rasp',
        },
      },
      defaults: {
        from: '"nest-modules" <vladuska159@gmail.com>',
      },
      template: {
        dir: path.join(__dirname, '..', 'src', 'templates'),
        adapter: new EjsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '../uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    RefreshTokensModule,
    MailModule,
    UsersModule,
    FilesModule,
  ],
  providers: [LobbyGateway],
})
export class AppModule {}
