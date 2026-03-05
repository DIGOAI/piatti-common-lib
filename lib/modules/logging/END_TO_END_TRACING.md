# Trazabilidad End-to-End con Request ID

Esta guía explica cómo implementar trazabilidad completa de requests desde el Gateway HTTP a través de microservicios NATS.

## 💡 Importante: Inyección Automática

El `requestId` se **inyecta automáticamente** en todos los logs cuando usas `PinoLogger` de `nestjs-pino`. NO necesitas llamar a `getRequestId()` manualmente en cada log.

**[📖 Ver Comparación: Logger vs PinoLogger](./LOGGER_VS_PINOLOGGER.md)**

## 🎯 Objetivo

Rastrear una petición HTTP desde que llega al Gateway hasta que pasa por todos los microservicios involucrados, usando el mismo `request-id` en todos los logs.

## 🔄 Flujo de Request ID

```
HTTP Request → Gateway (genera request-id) → NATS Message (metadata)
                  ↓                                    ↓
            Logs con requestId              Microservice (extrae request-id)
                                                       ↓
                                              Logs con requestId
```

## 📦 Configuración

### 1. Gateway HTTP

El Gateway genera el `request-id` y lo propaga automáticamente a través de NATS.

```typescript
// gateway/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { requestContext } from '@piatti/common-lib';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar contexto async para request tracking
  app.use((req, res, next) => {
    requestContext.run(new Map(), () => next());
  });

  await app.listen(3000);
}
bootstrap();
```

```typescript
// gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule, TransportModule } from '@piatti/common-lib';

@Module({
  imports: [
    ConfigModule.forRoot(),

    // Configurar logging para HTTP
    LoggingModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        logLevel: config.get('LOG_LEVEL', 'info'),
        applicationType: 'http', // 👈 Modo HTTP
        prettyPrint: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Configurar transporte NATS
    TransportModule.forNats(['nats://localhost:4222']),
  ],
})
export class AppModule {}
```

```typescript
// gateway/src/orders/orders.controller.ts
import { Controller, Post, Body, Logger } from '@nestjs/common';
import { MessagingService, getRequestId } from '@piatti/common-lib';
import { firstValueFrom } from 'rxjs';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const requestId = getRequestId();
    this.logger.log('Creating order via gateway', { requestId });

    // El MessagingService automáticamente incluye el request-id en metadata
    const result = await firstValueFrom(
      this.messagingService.send('create_order', createOrderDto),
    );

    this.logger.log('Order created', { requestId, orderId: result.id });
    return result;
  }
}
```

### 2. Microservicio con NATS

El microservicio extrae el `request-id` de la metadata NATS y lo usa en sus logs.

```typescript
// microservice/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RequestIdInterceptor } from '@piatti/common-lib';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: ['nats://localhost:4222'],
      },
    },
  );

  // 👇 IMPORTANTE: Aplicar interceptor globalmente
  app.useGlobalInterceptors(new RequestIdInterceptor());

  await app.listen();
}
bootstrap();
```

```typescript
// microservice/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule } from '@piatti/common-lib';

@Module({
  imports: [
    ConfigModule.forRoot(),

    // Configurar logging para microservicio
    LoggingModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        logLevel: config.get('LOG_LEVEL', 'info'),
        applicationType: 'microservice', // 👈 Modo Microservicio
        prettyPrint: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

```typescript
// microservice/src/orders/orders.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';

@Controller()
export class OrdersController {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OrdersController.name);
  }

  @MessagePattern('create_order')
  async createOrder(@Payload() data: any) {
    // ✨ El request-id se inyecta AUTOMÁTICAMENTE en todos los logs
    // NO necesitas usar getRequestId() manualmente

    // Extraer los datos del mensaje (sin la metadata)
    const orderData = data.data;

    // ✅ El requestId ya está en el log automáticamente
    this.logger.log('Received order creation request');

    // Procesar la orden
    const order = await this.processOrder(orderData);

    // ✅ RequestId automático en todos los logs
    this.logger.log('Order processed successfully');

    return order;
  }

  private async processOrder(orderData: any) {
    // ✅ Todos los logs en métodos privados también tienen requestId automático
    this.logger.debug('Processing order details');

    // Lógica de procesamiento...

    return { id: 'order-123', status: 'created' };
  }
}
```

### 🎯 Forma Alternativa (con getRequestId para metadata adicional)

Si necesitas el requestId para pasarlo a otros servicios o incluirlo en respuestas:

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { getRequestId } from '@piatti/common-lib';

@Controller()
export class OrdersController {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OrdersController.name);
  }

  @MessagePattern('create_order')
  async createOrder(@Payload() data: any) {
    const orderData = data.data;

    // ✅ Los logs YA tienen requestId automáticamente
    this.logger.log('Received order creation request');

    const order = await this.processOrder(orderData);

    // Solo si necesitas el requestId para la respuesta
    const requestId = getRequestId();
    return { ...order, requestId };
  }

  private async processOrder(orderData: any) {
    // ✅ RequestId automático
    this.logger.debug('Processing order details');

    return { id: 'order-123', status: 'created' };
  }
}
```

## 🔍 Ejemplo de Logs

Con esta configuración, verás logs correlacionados **automáticamente**:

**Gateway:**

```json
{
  "level": "INFO",
  "requestId": "01HQWXYZ12",
  "context": "HttpAccess",
  "msg": "Creating order via gateway"
}
```

**Microservicio (automático, sin getRequestId):**

```json
{
  "level": "INFO",
  "requestId": "01HQWXYZ12",
  "context": "OrdersController",
  "msg": "Received order creation request"
}
```

Mismo `requestId` = trazabilidad completa! ✅

## 🔧 Utilidades Disponibles

### Inyección Automática (Recomendado)

**El `requestId` se inyecta automáticamente en TODOS los logs** cuando usas `PinoLogger`:

```typescript
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class OrderService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OrderService.name);
  }

  async processOrder(orderId: string) {
    // ✨ requestId ya está aquí automáticamente
    this.logger.log('Processing order');

    // Output: {"level":"INFO","requestId":"01HQWXYZ12","context":"OrderService","msg":"Processing order"}
  }
}
```

### `getRequestId()` - Solo cuando necesites el valor

Úsalo solo cuando necesites el requestId como valor (para pasarlo a APIs externas, incluirlo en respuestas, etc.):

```typescript
import { getRequestId } from '@piatti/common-lib';

const requestId = getRequestId();
// Para incluir en respuestas o pasar a servicios externos
return { data: result, requestId };
```

### `setRequestId(requestId)`

Establece manualmente un request ID (casos raros):

```typescript
import { setRequestId } from '@piatti/common-lib';

setRequestId('custom-id-123');
```

### `runWithRequestId(requestId, callback)`

Ejecuta una función con un request ID específico:

```typescript
import { runWithRequestId } from '@piatti/common-lib';

await runWithRequestId('abc123', async () => {
  // Todo el código aquí tiene acceso al request ID
  const id = getRequestId(); // 'abc123'
  await processOrder();
});
```

## 🎛️ Opciones Avanzadas

### Metadata Adicional

Puedes agregar metadata adicional a los mensajes NATS:

```typescript
this.messagingService.send(
  'create_order',
  orderData,
  { userId: 'user-123', tenantId: 'tenant-456' }, // metadata adicional
);
```

### Extracción Manual de Datos

En el microservicio, el payload tiene esta estructura:

```typescript
@MessagePattern('create_order')
async createOrder(@Payload() payload: any) {
  const { data, metadata } = payload;

  // data: tu payload original
  // metadata: { 'x-request-id': '...', ...otros metadatos }

  console.log('Request ID:', metadata['x-request-id']);
  console.log('Order Data:', data);
}
```

### Request ID Personalizado

Si necesitas generar tu propio request ID:

```typescript
import { ulid } from 'ulid';
import { setRequestId } from '@piatti/common-lib';

const customId = ulid();
setRequestId(customId);
```

## ⚠️ Notas Importantes

1. **Middleware de Contexto**: El Gateway debe tener el middleware de contexto async habilitado
2. **Interceptor Global**: Los microservicios DEBEN aplicar `RequestIdInterceptor` globalmente
3. **Estructura de Payload**: Los microservicios reciben `{ data, metadata }`, no solo `data`
4. **Retrocompatibilidad**: Si no hay request-id en metadata, se genera uno nuevo automáticamente
5. **Usar PinoLogger**: Para inyección automática de requestId, usa `PinoLogger` de `nestjs-pino`, NO el `Logger` estándar de NestJS

## 🐛 Troubleshooting

### RequestId NO aparece automáticamente en los logs

**Causa**: Estás usando el `Logger` estándar de NestJS en lugar de `PinoLogger`.

**Problema**:

```typescript
import { Logger } from '@nestjs/common'; // ❌ NO inyecta requestId automáticamente

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async processOrder() {
    this.logger.log('Processing'); // ❌ Sin requestId automático
  }
}
```

**Solución**:

```typescript
import { PinoLogger } from 'nestjs-pino'; // ✅ Inyecta requestId automáticamente

@Injectable()
export class OrderService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OrderService.name);
  }

  async processOrder() {
    this.logger.log('Processing'); // ✅ RequestId automático
  }
}
```

### Request ID es `undefined` en el microservicio

**Causa**: No se aplicó el `RequestIdInterceptor` globalmente.

**Solución**:

```typescript
app.useGlobalInterceptors(new RequestIdInterceptor());
```

### Request ID no se propaga desde el Gateway

**Causa**: No se habilitó el contexto async en el Gateway.

**Solución**:

```typescript
app.use((req, res, next) => {
  requestContext.run(new Map(), () => next());
});
```

### Los datos llegan como `undefined` en el microservicio

**Causa**: Estás accediendo directamente al payload en lugar de `payload.data`.

**Solución**:

```typescript
@MessagePattern('create_order')
async createOrder(@Payload() payload: any) {
  const orderData = payload.data; // 👈 Acceder a .data
}
```

## 📚 Recursos Adicionales

- [AsyncLocalStorage en Node.js](https://nodejs.org/api/async_context.html)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Distributed Tracing Best Practices](https://opentelemetry.io/docs/)
