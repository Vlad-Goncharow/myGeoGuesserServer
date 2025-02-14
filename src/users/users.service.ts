import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { UpdatePatchDto } from './dto/update-patch.dto'
import { UpdateNicknameDto } from './dto/update-nickname.dto'
import { UpdateAvatarDto } from './dto/update-avatar.dto'
import { FilesService } from 'src/files/files.service'

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private fileService: FilesService
  ) {}

  async findOne(id: number) {
    const findUser = await this.prisma.user.findUnique({
      where: { id: id },
    })

    return findUser
  }

  async updatePatch(userId: number, updatePatchDto: UpdatePatchDto) {
    const findUser = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!findUser) {
      throw new HttpException({ message: 'User not found' }, HttpStatus.BAD_REQUEST)
    }

    const updateUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        patch: updatePatchDto.patch,
      },
    })

    return {
      success: true,
      user: updateUser,
    }
  }

  async updateNickname(userId: number, updateNicknameDto: UpdateNicknameDto) {
    const findUser = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!findUser) {
      throw new HttpException({ message: 'User not found' }, HttpStatus.BAD_REQUEST)
    }

    const updateUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: updateNicknameDto.nickname,
      },
    })

    return {
      success: true,
      user: updateUser,
    }
  }

  async updateAvatar(userId: number, updateAvatarDto: UpdateAvatarDto) {
    const findUser = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!findUser) {
      throw new HttpException({ message: 'User not found' }, HttpStatus.BAD_REQUEST)
    }

    await this.fileService.deleteFile(findUser.avatar)

    const updateUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: updateAvatarDto.avatar,
      },
    })

    return {
      success: true,
      user: updateUser,
    }
  }
}
