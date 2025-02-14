import { forwardRef, Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { PrismaService } from 'src/prisma.service'
import { AuthModule } from 'src/auth/auth.module'
import { FilesService } from 'src/files/files.service'

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, FilesService],
  imports: [forwardRef(() => AuthModule)],
})
export class UsersModule {}
