import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Deduplicação de quem consome (decisão D6): a entrega é "pelo menos uma vez", então o mesmo evento pode chegar duas vezes.
 * `claim` devolve true na primeira vez que vê o id e false nas seguintes.
 * Para valer de verdade, chame `claim` na mesma transação que aplica o efeito do evento.
 */
@Injectable()
export class ProcessedEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(eventId: string, type: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      await (tx ?? this.prisma).processedEvent.create({ data: { id: eventId, type } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
      throw error;
    }
  }
}
