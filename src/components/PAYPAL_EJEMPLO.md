# Integración PayPal - Ejemplo de uso

## 1. Usar el componente PaypalCheckout en una página

### Ejemplo básico:

```tsx
'use client';

import { PaypalCheckout } from '@/components/PaypalCheckout';
import { useState } from 'react';

export default function CheckoutPage() {
  const [pedidoId] = useState('pedido-123');
  const total = 49.99;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1>Checkout</h1>
      <p>Total: {total}€</p>
      
      <PaypalCheckout
        pedidoId={pedidoId}
        total={total}
        currency="EUR"
        onSuccess={(data) => {
          console.log('Pago exitoso:', data);
          // Aquí puedes redirigir a una página de confirmación
          // window.location.href = '/pedidos/confirmacion';
        }}
        onError={(error) => {
          console.error('Error en pago:', error);
        }}
      />
    </div>
  );
}
```

## 2. Integración con pedido en BD

Si tienes un pedido en la base de datos:

```tsx
'use client';

import { PaypalCheckout } from '@/components/PaypalCheckout';
import { useEffect, useState } from 'react';

export default function PedidoCheckout({ pedidoId }: { pedidoId: string }) {
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPedido() {
      const res = await fetch(`/api/pedidos/${pedidoId}`);
      const data = await res.json();
      setPedido(data);
      setLoading(false);
    }
    cargarPedido();
  }, [pedidoId]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1>Pagar pedido {pedidoId}</h1>
      <p>Total: {pedido.total}€</p>

      <PaypalCheckout
        pedidoId={pedidoId}
        total={parseFloat(pedido.total)}
        currency="EUR"
        onSuccess={async (data) => {
          // Actualizar estado del pedido a "pagado"
          await fetch(`/api/pedidos/${pedidoId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              estado: 'pagado',
              paypalOrderId: data.orderId,
              paypalCaptureId: data.captureId,
            }),
          });
          window.location.href = `/pedidos/${pedidoId}/confirmacion`;
        }}
      />
    </div>
  );
}
```

## 3. Flujo completo del pago

1. **Usuario hace clic en "Pagar con PayPal"**
   - El componente llama a `/api/paypal/crear-orden`
   - Retorna un ID de orden de PayPal

2. **Usuario aprueba el pago en PayPal**
   - PayPal retorna la aprobación

3. **El frontend captura la orden**
   - Llama a `/api/paypal/capturar-orden`
   - Se realiza el cobro real

4. **Success callback**
   - Tu aplicación marca el pedido como pagado
   - Redirige al usuario a confirmación

## 4. Variables de entorno necesarias

En `.env.local`:
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id
PAYPAL_CLIENT_SECRET=tu_client_secret
PAYPAL_MODE=sandbox
```

## 5. Códigos de respuesta

### Crear orden exitosa (200):
```json
{
  "id": "5O190127TN364401T"
}
```

### Capturar orden exitosa (200):
```json
{
  "ok": true,
  "orderId": "5O190127TN364401T",
  "status": "COMPLETED",
  "captureId": "1234567890",
  "amount": "49.99",
  "currency": "EUR"
}
```

## 6. Testing en Sandbox

Usa estas credenciales de prueba en PayPal:

**Buyer account:**
- Email: sb-xxxxxxxx@personal.example.com
- Pass: cualquier contraseña

**Seller account:**
- Es tu cuenta de negocio

## 7. Cambiar a producción

Cuando esté listo:

1. En PayPal Dashboard, ve a **"Live"** (no Sandbox)
2. Copia el nuevo **Client ID** y **Secret**
3. Actualiza `.env.local`:
   ```
   PAYPAL_MODE=production
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=nuevo_id
   PAYPAL_CLIENT_SECRET=nuevo_secret
   ```

## 8. Tipos de TypeScript disponibles

```typescript
interface PaypalCheckoutProps {
  pedidoId: string;          // ID del pedido en tu BD
  total: number;              // Importe a cobrar
  currency?: string;          // Moneda (default: EUR)
  onSuccess?: (data: any) => void;  // Callback de éxito
  onError?: (error: any) => void;   // Callback de error
}
```

## 9. Troubleshooting

**Error: "Missing pedidoId or total"**
- Verifica que estés pasando `pedidoId` y `total` correctamente

**Error: "PayPal CLIENT_ID and CLIENT_SECRET are required"**
- Verifica que `.env.local` tiene las credenciales
- Reinicia el servidor (`npm run dev`)

**El botón de PayPal no aparece**
- Verifica que `NEXT_PUBLIC_PAYPAL_CLIENT_ID` está en `.env.local`
- El Client ID debe ser válido y de Sandbox si estás en desarrollo
