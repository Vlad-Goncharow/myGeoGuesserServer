import { BadRequestException, Injectable } from '@nestjs/common'
import * as sharp from 'sharp'
import * as uuid from 'uuid'
import * as fs from 'fs-extra'
import * as path from 'path'

@Injectable()
export class FilesService {
  private readonly uploadPath = path.join(__dirname, '..', '..', 'uploads')

  constructor() {
    this.ensureDirectoryExists(this.uploadPath)
  }

  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await fs.ensureDir(directory)
    } catch (err) {
      console.log(err)
      throw new Error(`Failed to create directory: ${directory}`)
    }
  }

  private validateFileType(file: Express.Multer.File, allowedTypes: string[]): void {
    const fileExtension = path.extname(file.originalname).toLowerCase()
    if (!allowedTypes.includes(fileExtension)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types are: ${allowedTypes.join(', ')}`
      )
    }
  }

  private async checkImageResolution(
    file: Express.Multer.File,
    width?: number,
    height?: number
  ): Promise<void> {
    if (width && height) {
      const metadata = await sharp(file.buffer).metadata()
      if (metadata.width !== width || metadata.height !== height) {
        throw new BadRequestException(`Image must be exactly ${width}x${height} pixels`)
      }
    }
  }

  async getAllPatchs() {
    try {
      return fs.readdirSync(this.uploadPath + '/patchs').map((file) => `/patchs/${file}`)
    } catch (error) {
      console.error('Ошибка чтения папки:', error)
      return []
    }
  }

  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    this.validateFileType(file, ['.jpg', '.jpeg', '.png'])
    await this.checkImageResolution(file, 256, 256)

    const avatarsDir = path.join(this.uploadPath, 'avatars')
    await this.ensureDirectoryExists(avatarsDir)
    const fileName = `${uuid.v4()}.jpg`

    await sharp(file.buffer).toFile(`${avatarsDir}/${fileName}`)
    return `/avatars/${fileName}`
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!filePath || filePath.includes('default-avatar.jpg')) {
      return
    }

    const fullPath = path.join(__dirname, '..', '..', 'uploads', filePath) // или `this.uploadPath`

    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.error('Ошибка удаления файла:', err)
        }
      })
    }
  }
}
