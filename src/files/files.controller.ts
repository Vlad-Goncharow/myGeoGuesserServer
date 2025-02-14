import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FilesService } from './files.service'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('patchs')
  getAllPatchs() {
    return this.filesService.getAllPatchs()
  }

  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 2 * 1024 * 1024 },
    })
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    const fileName = await this.filesService.uploadAvatar(file)
    return { filename: fileName }
  }
}
