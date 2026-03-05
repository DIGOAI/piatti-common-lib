# Logging Module

Módulo global de logging para aplicaciones NestJS basado en Pino, diseñado siguiendo las mejores prácticas de NestJS.

## Características

- ✅ **Módulo Dinámico**: Configuración flexible mediante `forRoot()` y `forRootAsync()`
- ✅ **Módulo Global**: Disponible en toda la aplicación sin necesidad de re-importar
- ✅ **Adaptativo al Tipo de App**: Soporte para HTTP, microservicios (NATS/gRPC), e híbridos
- ✅ **End-to-End Tracing**: Propagación automática de request-id desde Gateway a microservicios
- ✅ **Request ID Tracking**: Generación automática de IDs únicos para cada request HTTP
- ✅ **HTTP Logging**: Intercepta y registra automáticamente todas las peticiones HTTP (solo en modo HTTP)
- ✅ **Serializers Personalizados**: Control sobre qué información se registra (seguridad)
- ✅ **Pretty Print**: Formato legible para desarrollo
- ✅ **Configuración Tipo-Segura**: TypeScript interfaces para todas las opciones

## 🎯 Trazabilidad End-to-End

Este módulo incluye soporte completo para rastrear peticiones desde el Gateway HTTP a través de todos los microservicios NATS:

- 🔄 **Propagación Automática**: El request-id se incluye automáticamente en metadata NATS
- 📝 **Logs Correlacionados**: Mismo request-id en logs del Gateway y microservicios
- 🔍 **AsyncLocalStorage**: Acceso al request-id en cualquier parte del código
- ⚡ **Zero Configuration**: Funciona automáticamente con `MessagingService`

**[📖 Ver Guía Completa de Trazabilidad End-to-End](./END_TO_END_TRACING.md)**

## Instalación

El módulo requiere las siguientes dependencias:

```bash
pnpm add nestjs-pino pino-http ulid
pnpm add -D pino-pretty
```

## Tipos de Aplicación

El módulo soporta tres tipos de aplicación:

| Tipo           | Descripción                     | Uso                                              |
| -------------- | ------------------------------- | ------------------------------------------------ |
| `http`         | REST API con interceptores HTTP | Gateways, APIs REST tradicionales                |
| `microservice` | Sin interceptores HTTP          | Microservicios con NATS, gRPC, RabbitMQ, etc.    |
| `hybrid`       | Ambos modos                     | Aplicaciones que exponen HTTP y reciben mensajes |

### ⚠️ Importante para Microservicios

Si estás usando `NestFactory.createMicroservice()` con transporte NATS, gRPC, o similar:

- **Debes** usar `applicationType: 'microservice'`
- Los interceptores HTTP no funcionarán (no hay req/res HTTP)
- El logging básico funciona perfectamente para logs de aplicación

## Uso Básico

### Para API HTTP (Gateway)

```typescript
// main.ts
const app = await NestFactory.create(AppModule);

// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule } from '@piatti/common-lib';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        logLevel: configService.get('LOG_LEVEL', 'info'),
        applicationType: 'http', // 👈 Para APIs REST
        prettyPrint: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Para Microservicio con NATS

```typescript
// main.ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.NATS,
    options: {
      servers: ['nats://localhost:4222'],
    },
  },
);

// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule } from '@piatti/common-lib';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        logLevel: configService.get('LOG_LEVEL', 'info'),
        applicationType: 'microservice', // 👈 Para microservicios
        prettyPrint: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Para Aplicación Híbrida

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.NATS,
  options: { servers: ['nats://localhost:4222'] },
});

// app.module.ts
@Module({
  imports: [
    LoggingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        logLevel: configService.get('LOG_LEVEL', 'info'),
        applicationType: 'hybrid', // 👈 HTTP + Microservicio
        prettyPrint: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Configuración Simple (Sin ConfigService)

```typescript
import { Module } from '@nestjs/common';
import { LoggingModule } from '@piatti/common-lib';

@Module({
  imports: [
    LoggingModule.forRoot({
      logLevel: 'debug',
      applicationType: 'http',
      prettyPrint: true,
    }),
  ],
})
export class AppModule {}
```

### Configuración Predeterminada

```typescript
import { Module } from '@nestjs/common';
import { LoggingModule } from '@piatti/common-lib';

@Module({
  imports: [
    // Valores predeterminados:
    // logLevel='info', applicationType='http', prettyPrint=false
    LoggingModule.forRoot(),
  ],
})
export class AppModule {}
```

## Configuración

### LoggingModuleOptions

| Opción            | Tipo              | Predeterminado | Descripción                                                           |
| ----------------- | ----------------- | -------------- | --------------------------------------------------------------------- |
| `logLevel`        | `LogLevel`        | `'info'`       | Nivel de logging: 'error', 'warn', 'info', 'http', 'verbose', 'debug' |
| `prettyPrint`     | `boolean`         | `false`        | Activa formato legible para desarrollo                                |
| `applicationType` | `ApplicationType` | `'http'`       | Tipo de aplicación: 'http', 'microservice', o 'hybrid'                |
| `forRoutes`       | `string[]`        | `['/*path']`   | Rutas donde aplicar el interceptor HTTP (solo para http/hybrid)       |

### Diferencias por Tipo de Aplicación

| Característica      | `http`       | `microservice` | `hybrid`     |
| ------------------- | ------------ | -------------- | ------------ |
| Interceptores HTTP  | ✅ Sí        | ❌ No          | ✅ Sí        |
| Request ID Tracking | ✅ Sí        | ❌ No          | ✅ Sí        |
| Serializers HTTP    | ✅ Sí        | ❌ No          | ✅ Sí        |
| Logging Básico      | ✅ Sí        | ✅ Sí          | ✅ Sí        |
| Context             | `HttpAccess` | `Microservice` | `HttpAccess` |

## Uso en Servicios

### Usar PinoLogger (Recomendado) ⭐

**PinoLogger inyecta automáticamente el `requestId` en TODOS los logs**, tanto en HTTP como en microservicios:

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class OrderService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OrderService.name);
  }

  async processOrder(orderId: string) {
    // ✨ requestId se inyecta automáticamente
    this.logger.log('Processing order');
    // Output: {"level":"INFO","requestId":"01HQWXYZ12","context":"OrderService","msg":"Processing order"}

    try {
      const order = await this.repository.findOne(orderId);
      // ✅ RequestId automático en todos los logs
      this.logger.log('Order processed successfully');
      return order;
    } catch (error) {
      // ✅ RequestId automático incluso en errores
      this.logger.error('Failed to process order', error);
      throw error;
    }
  }
}
```

### Usar Logger Estándar (Sin inyección automática)

Si usas el `Logger` estándar de NestJS, debes pasar el `requestId` manualmente:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { getRequestId } from '@piatti/common-lib';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async createUser(userData: CreateUserDto) {
    const requestId = getRequestId();
    this.logger.log('Creating user', { requestId, userData });

    try {
      const user = await this.userRepository.create(userData);
      this.logger.log('User created successfully', {
        requestId,
        userId: user.id,
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }
}
```

**💡 Tip**: Usa `PinoLogger` para obtener inyección automática de `requestId` sin código adicional.

**[📖 Ver Comparación Completa: Logger vs PinoLogger](./LOGGER_VS_PINOLOGGER.md)**

## Request ID Tracking

El módulo genera automáticamente un Request ID único para cada petición HTTP (solo en modo `http` o `hybrid`):

```typescript
// En tus controllers o services
@Get()
findAll(@Req() request: Request) {
  const requestId = request.id; // ID único de la petición
  this.logger.log('Finding all users', { requestId });
  // ...
}
```

El Request ID también se incluye en el header de respuesta `X-Request-Id`.

**Nota:** Esta funcionalidad solo está disponible en aplicaciones tipo `http` o `hybrid`, no en microservicios puros.

## Logging en Microservicios

Para microservicios (NATS, gRPC, RabbitMQ, etc.) que usan `createMicroservice()`:

### ✅ Lo que Funciona

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  @MessagePattern('create_order')
  async createOrder(data: CreateOrderDto) {
    this.logger.log('Order received', { orderId: data.orderId });

    try {
      const order = await this.processOrder(data);
      this.logger.log('Order processed', { orderId: order.id });
      return order;
    } catch (error) {
      this.logger.error('Order processing failed', error);
      throw error;
    }
  }
}
```

### ❌ Lo que NO Funciona

- `request.id` - No hay objeto request HTTP
- Headers `X-Request-Id` - No hay headers HTTP
- HTTP interceptors - No interceptan mensajes del transporte
- Serializers HTTP - No hay req/res para serializar

### 💡 Recomendación

Para microservicios, genera tus propios IDs de correlación:

```typescript
import { ulid } from 'ulid';

@MessagePattern('create_order')
async createOrder(data: CreateOrderDto) {
  const correlationId = data.correlationId || ulid();
  this.logger.log('Processing order', { correlationId, orderId: data.orderId });
  // Usa correlationId para tracking end-to-end
}
```

## Serializers

Los serializers personalizados controlan qué información se registra:

### Request Serializer

Registra información limitada del request para evitar exponer datos sensibles:

- ID de la petición
- Método HTTP
- URL y query params
- Headers seleccionados (no incluye Authorization)
- IP y puerto remoto

### Response Serializer

Registra toda la información de la respuesta por defecto. Puedes personalizar esto:

```typescript
import { httpReqSerializer, httpResSerializer } from '@piatti/common-lib';

// Crear tu propio serializer personalizado
export const customResSerializer = (res) => ({
  statusCode: res.statusCode,
  headers: {
    'content-type': res.headers['content-type'],
  },
});
```

## Logs Estructurados

Pino genera logs estructurados en formato JSON por defecto:

```json
{
  "level": "INFO",
  "time": 1709640000000,
  "context": "HttpAccess",
  "req": {
    "id": "01HQWXYZ12",
    "method": "GET",
    "url": "/users/123"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45,
  "msg": "Request completed"
}
```

## Pretty Print para Desarrollo

Activa `prettyPrint: true` para obtener logs legibles en desarrollo:

```
[2024-03-05 10:30:15.123] INFO (HttpAccess): Request completed
    req: {
      "id": "01HQWXYZ12",
      "method": "GET",
      "url": "/users/123"
    }
    responseTime: 45ms
```

## Niveles de Log Dinámicos

El módulo ajusta automáticamente el nivel de log según el código de estado HTTP:

- **500+**: `error`
- **400-499**: `warn`
- **Otros**: `info`

## Arquitectura

El módulo sigue el patrón de Módulo Dinámico de NestJS:

```
logging/
├── index.ts                 # Barrel exports
├── logging.module.ts        # @Global() Dynamic Module
├── logging.config.ts        # Factory de configuración
├── logging.types.ts         # Interfaces tipo-seguras
├── logging.serializers.ts   # Serializers personalizados
└── README.md               # Documentación
```

### Ventajas del Diseño

1. **Desacoplamiento**: No depende de configuraciones externas hardcoded
2. **Reutilizable**: Puede ser usado en múltiples aplicaciones
3. **Testeable**: Fácil de mockear y testear
4. **Tipo-Seguro**: TypeScript interfaces para toda la configuración
5. **Flexible**: Soporta configuración estática y dinámica

## Mejores Prácticas

### ✅ DO

```typescript
// Usar contextos descriptivos
private readonly logger = new Logger('UserService');

// Logs estructurados con metadata
this.logger.log('User created', { userId, email });

// Manejo de errores apropiado
this.logger.error('Database connection failed', error.stack);
```

### ❌ DON'T

```typescript
// No usar console.log
console.log('User created'); // ❌

// No loguear información sensible
this.logger.log('User login', { password: '...' }); // ❌

// No usar strings sin contexto
this.logger.log('Something happened'); // ❌
```

## Testing

Para testear servicios que usan el logger:

```typescript
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let logger: Logger;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    logger = module.get<Logger>(Logger);
  });

  it('should log user creation', async () => {
    await service.createUser({ email: 'test@example.com' });
    expect(logger.log).toHaveBeenCalledWith(
      'Creating user',
      expect.any(Object),
    );
  });
});
```

## Recursos Adicionales

- [NestJS Logging](https://docs.nestjs.com/techniques/logger)
- [Pino Documentation](https://getpino.io/)
- [nestjs-pino](https://github.com/iamolegga/nestjs-pino)
