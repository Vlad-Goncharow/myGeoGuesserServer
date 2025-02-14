import { User } from '@prisma/client'

export interface GenerateToken {
  id: number
  email: string
}

export interface CustomRequest extends Request {
  cookies: Record<string, string>
  user: User
}

export interface CustomRequestUser extends Request {
  user: User
}
