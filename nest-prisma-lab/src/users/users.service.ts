import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');

  constructor(private readonly prisma: PrismaService) {}

  async create(username: string, password: string) {
    this.logger.log(`Registering user: ${username}`);
    const existing = await this.prisma.users.findUnique({ where: { username } });
    if (existing) {
      this.logger.warn(`Username ${username} already exists`);
      throw new ConflictException('Username already exists');
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await this.prisma.users.create({
      data: { username, password: hashed, role: 'USER' },
    });
    const { password: _pw, ...result } = user;
    return result;
  }

  async findByUsername(username: string) {
    return this.prisma.users.findUnique({ where: { username } });
  }
}