import { AsyncLocalStorage } from 'async_hooks';
import { GrpcOptions, ServerGrpc } from '@nestjs/microservices';
import { isObservable, Observable } from 'rxjs';

// Holds the instancekey (tenant) for the gRPC call currently being handled.
// Every call gets its own store, so concurrent calls for different instances
// can no longer overwrite each other's key (see AbstractRepository.instancekey).
export const tenantContext = new AsyncLocalStorage<{ instancekey?: string }>();

// The instancekey a request was sent with, so handlers that never call
// setInstanceKey() still query the right database.
function instancekeyFrom(data: any): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  return data.instancekey || data.instanceKey || data.headers?.instancekey || undefined;
}

// gRPC server that runs every handler inside its own tenant context.
// Done at the transport level so it applies to all handlers without changing
// which global pipes/filters the hybrid apps use.
export class TenantAwareServerGrpc extends ServerGrpc {
  createServiceMethod(methodHandler: Function, protoNativeHandler: any, streamType: any): Function {
    const wrapped = (data: any, metadata: any, call: any) => {
      const store = { instancekey: instancekeyFrom(data) };
      return tenantContext.run(store, () =>
        Promise.resolve(methodHandler(data, metadata, call)).then((result) =>
          // Handlers may return a lazy observable that is subscribed later; keep it in the same context
          isObservable(result)
            ? new Observable((subscriber) => tenantContext.run(store, () => result.subscribe(subscriber)))
            : result,
        ),
      );
    };
    return super.createServiceMethod(wrapped, protoNativeHandler, streamType);
  }
}

export function tenantAwareGrpc(options: GrpcOptions['options']) {
  return { strategy: new TenantAwareServerGrpc(options) };
}
