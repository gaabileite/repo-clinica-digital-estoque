import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';
import { CreateReturnDto } from './dto/create-return.dto';

@Injectable()
export class ReturnsService {
  create(_clinicId: string, _body: CreateReturnDto): Promise<never> {
    return notImplemented('E-24', 'Devolução de item retirado e não utilizado');
  }
}
