import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { config } from 'dotenv'
import * as cookieParser from 'cookie-parser'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as path from 'path'
import { WsAdapter } from '@nestjs/platform-ws'
config()

async function bootstrap() {
  const PORT = process.env.PORT || 4445

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      optionsSuccessStatus: 200,
      credentials: true,
    },
  })

  app.useWebSocketAdapter(new WsAdapter(app))

  app.setViewEngine('ejs')
  app.setBaseViewsDir(path.join(__dirname, '..', 'src', 'templates'))

  app.use(cookieParser())
  await app.listen(PORT, () => console.log(`server start on port ${PORT}`))
}

bootstrap()
