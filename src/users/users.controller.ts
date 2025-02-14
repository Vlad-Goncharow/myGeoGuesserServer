import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common'
import { UpdatePatchDto } from './dto/update-patch.dto'
import { UsersService } from './users.service'
import { CustomRequestUser } from 'src/types/auth'
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'
import { UpdateNicknameDto } from './dto/update-nickname.dto'
import { UpdateAvatarDto } from './dto/update-avatar.dto'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id)
  }

  @Put('/update-patch')
  @UseGuards(JwtAuthGuard)
  updatePatch(@Req() req: CustomRequestUser, @Body() updatePatchDto: UpdatePatchDto) {
    const { id } = req.user
    return this.usersService.updatePatch(id, updatePatchDto)
  }

  @Put('/update-nickname')
  @UseGuards(JwtAuthGuard)
  updateNickname(@Req() req: CustomRequestUser, @Body() updateNicknameDto: UpdateNicknameDto) {
    const { id } = req.user
    return this.usersService.updateNickname(id, updateNicknameDto)
  }

  @Put('/update-avatar')
  @UseGuards(JwtAuthGuard)
  updateAvatar(@Req() req: CustomRequestUser, @Body() updateAvatarDto: UpdateAvatarDto) {
    const { id } = req.user
    return this.usersService.updateAvatar(id, updateAvatarDto)
  }
}
