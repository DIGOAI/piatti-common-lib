# Logger vs PinoLogger: Inyección Automática de Request ID

## 🆚 Comparación Rápida

### ❌ Logger Estándar (Manual)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { getRequestId } from '@piatti/common-lib';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async processOrder(orderId: string) {
    // ❌ Tienes que obtener el requestId manualmente
    const requestId = getRequestId();
    this.logger.log('Processing order', { requestId, orderId });

    await this.validateOrder(orderId);

    // ❌ Tienes que pasarlo a cada log
    this.logger.log('Order validated', { requestId, orderId });

    const result = await this.saveOrder(orderId);

    // ❌ Y otra vez...
    this.logger.log('Order saved', { requestId, orderId });

    return result;
  }

  private async validateOrder(orderId: string) {
    // ❌ En métodos privados también
    const requestId = getRequestId();
    this.logger.debug('Validating order', { requestId, orderId });
    // ...
  }
}
```

**Output:**

```json
{"level":"log","message":"Processing order","context":"OrderService","requestId":"01HQWXYZ12","orderId":"123"}
{"level":"log","message":"Order validated","context":"OrderService","requestId":"01HQWXYZ12","orderId":"123"}
{"level":"log","message":"Order saved","context":"OrderService","requestId":"01HQWXYZ12","orderId":"123"}
```

---

### ✅ PinoLogger (Automático)

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class OrderService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OrderService.name);
  }

  async processOrder(orderId: string) {
    // ✅ requestId se inyecta automáticamente
    this.logger.log('Processing order');

    await this.validateOrder(orderId);

    // ✅ Siempre está presente, sin código adicional
    this.logger.log('Order validated');

    const result = await this.saveOrder(orderId);

    // ✅ En todos los logs
    this.logger.log('Order saved');

    return result;
  }

  private async validateOrder(orderId: string) {
    // ✅ También en métodos privados
    this.logger.debug('Validating order');
    // ...
  }
}
```

**Output:**

```json
{"level":"INFO","requestId":"01HQWXYZ12","context":"OrderService","msg":"Processing order"}
{"level":"INFO","requestId":"01HQWXYZ12","context":"OrderService","msg":"Order validated"}
{"level":"INFO","requestId":"01HQWXYZ12","context":"OrderService","msg":"Order saved"}
```

---

## 📊 Ventajas de PinoLogger

| Característica       | Logger           | PinoLogger             |
| -------------------- | ---------------- | ---------------------- |
| RequestId automático | ❌ Manual        | ✅ Automático          |
| Código limpio        | ❌ Repetitivo    | ✅ Conciso             |
| Menos errores        | ❌ Fácil olvidar | ✅ Siempre presente    |
| Performance          | ⚠️ Buena         | ✅ Mejor (JSON nativo) |
| Structured logging   | ⚠️ Limitado      | ✅ Completo            |

## 🎯 Casos de Uso

### Cuándo usar PinoLogger ⭐

- **Siempre** en aplicaciones con trazabilidad end-to-end
- En microservicios con NATS/gRPC
- Cuando necesitas structured logging (JSON)
- Para máximo performance en producción

### Cuándo usar Logger Estándar

- Proyectos legacy que ya lo usan
- Ejemplos/prototipos simples
- Cuando no necesitas trazabilidad distribuida

## 🚀 Migración de Logger a PinoLogger

### Paso 1: Cambiar el import

```typescript
// Antes
import { Injectable, Logger } from '@nestjs/common';

// Después
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
```

### Paso 2: Cambiar la inicialización

```typescript
// Antes
export class MyService {
  private readonly logger = new Logger(MyService.name);
}

// Después
export class MyService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(MyService.name);
  }
}
```

### Paso 3: Eliminar getRequestId()

```typescript
// Antes
async myMethod() {
  const requestId = getRequestId();
  this.logger.log('Message', { requestId, data });
}

// Después
async myMethod() {
  this.logger.log('Message'); // requestId automático
}
```

## 💡 Tips Adicionales

### 1. Context es Opcional pero Recomendado

```typescript
constructor(private readonly logger: PinoLogger) {
  this.logger.setContext(OrderService.name); // Recomendado
}
```

### 2. Puedes Agregar Metadata Adicional

```typescript
this.logger.log({ orderId, userId }, 'Order created');
// Output: {"level":"INFO","requestId":"01HQW...","orderId":"123","userId":"456","msg":"Order created"}
```

### 3. Bindings para Metadata Permanente

```typescript
constructor(private readonly logger: PinoLogger) {
  this.logger.setContext(OrderService.name);
  // Agrega campos que aparecerán en TODOS los logs de este servicio
  this.logger.assign({ service: 'orders', version: '1.0' });
}
```

### 4. Niveles de Log

```typescript
this.logger.trace('Very detailed');
this.logger.debug('Debug info');
this.logger.log('General info'); // Alias de .info()
this.logger.info('General info');
this.logger.warn('Warning');
this.logger.error('Error occurred', error);
this.logger.fatal('Critical error');
```

## 📚 Referencias

- [nestjs-pino Documentation](https://github.com/iamolegga/nestjs-pino)
- [Pino Documentation](https://getpino.io/)
- [End-to-End Tracing Guide](./END_TO_END_TRACING.md)
