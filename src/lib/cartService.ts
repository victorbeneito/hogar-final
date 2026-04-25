const CART_STORAGE_KEY = 'cart';
const CART_SESSION_KEY = 'cart_session_id';

// 1. Definimos la interfaz completa (con los campos que te daban error)
export interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  
  // Propiedades opcionales de variantes/ofertas
  precioFinal?: number;
  tamanoSeleccionado?: string;
  colorSeleccionado?: string;
  stock?: number;
  
  // 👇 AÑADIMOS ESTO PARA SOLUCIONAR EL ERROR
  tiradorSeleccionado?: string;
  atributo?: string;
}

export interface CartSyncItem extends CartItem {}

const getSessionId = () => {
  if (typeof window === 'undefined') return null;

  let sessionId = localStorage.getItem(CART_SESSION_KEY);
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CART_SESSION_KEY, sessionId);
  }

  return sessionId;
};

const syncCart = (cart: CartItem[]) => {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();
  if (!sessionId) return;

  const total = cart.reduce((sum, item) => {
    const price = item.precioFinal ?? item.precio;
    return sum + price * item.cantidad;
  }, 0);

  void fetch('/api/carritos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      items: cart,
      total,
    }),
  });
};

// 2. Obtener carrito
export const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem(CART_STORAGE_KEY);
  return cart ? JSON.parse(cart) : [];
};

// 3. Guardar carrito (setCart)
export const setCart = (cart: CartItem[]) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event("storage"));
  }
  syncCart(cart);
};

// 4. Añadir producto
export const addToCart = (product: CartItem) => {
  const cart = getCart();

  const sameSelection = (item: CartItem) =>
    item.id === product.id &&
    (item.tamanoSeleccionado ?? "") === (product.tamanoSeleccionado ?? "") &&
    (item.colorSeleccionado ?? "") === (product.colorSeleccionado ?? "") &&
    (item.tiradorSeleccionado ?? "") === (product.tiradorSeleccionado ?? "") &&
    (item.atributo ?? "") === (product.atributo ?? "");

  const existing = cart.find((item) => sameSelection(item));
  
  if (existing) {
    existing.cantidad += 1;
  } else {
    cart.push({
      ...product,
      id: Number(product.id),
      cantidad: 1,
    });
  }
  
  setCart(cart);
  return cart;
};

// 5. Eliminar producto
export const removeFromCart = (productId: number, product?: Partial<CartItem>) => {
  const cart = getCart();
  const newCart = cart.filter((item) => {
    if (item.id !== productId) return true;
    if (!product) return false;

    return !(
      (item.tamanoSeleccionado ?? "") === (product.tamanoSeleccionado ?? "") &&
      (item.colorSeleccionado ?? "") === (product.colorSeleccionado ?? "") &&
      (item.tiradorSeleccionado ?? "") === (product.tiradorSeleccionado ?? "") &&
      (item.atributo ?? "") === (product.atributo ?? "")
    );
  });
  setCart(newCart);
  return newCart;
};

// 6. Vaciar carrito
export const clearCart = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(CART_SESSION_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event("storage"));
  }
};

export const getCartSessionId = () => getSessionId();
export const syncCartSnapshot = (cart: CartItem[]) => syncCart(cart);
