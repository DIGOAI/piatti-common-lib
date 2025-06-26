import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { TRANSPORT_CLIENT } from './transport.constants';

type PatternType = string | { cmd: string };

@Injectable()
export class MessagingService {
  constructor(@Inject(TRANSPORT_CLIENT) private readonly client: ClientProxy) {}

  send<TInput = any, TOutput = any>(
    pattern: PatternType,
    data: TInput,
  ): Observable<TOutput> {
    return this.client.send(pattern, data);
  }

  emit<TInput = any>(pattern: PatternType, data: TInput): Observable<void> {
    return this.client.emit(pattern, data);
  }
}
