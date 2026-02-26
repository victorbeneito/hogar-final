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

// 2. Obtener carrito
export const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
};

// 3. Guardar carrito (setCart)
export const setCart = (cart: CartItem[]) => {
  localStorage.setItem('cart', JSON.stringify(cart));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event("storage"));
  }
};

// 4. Añadir producto
export const addToCart = (product: CartItem) => {
  const cart = getCart();
  
  // Buscamos si ya existe el producto.
  // NOTA: Si tienes variantes (Talla M vs Talla L), deberías comparar también la talla/color.
  // Por ahora mantenemos la lógica simple por ID para que compile.
  const existing = cart.find((item) => item.id === product.id);
  
  if (existing) {
    existing.cantidad += 1;
  } else {
    // Nos aseguramos de guardar el ID como número y pasar todas las props (precioFinal, etc)
    cart.push({ 
        ...product, 
        id: Number(product.id), 
        cantidad: 1 
    });
  }
  
  setCart(cart);
  return cart;
};

// 5. Eliminar producto
export const removeFromCart = (productId: number) => {
  const cart = getCart();
  const newCart = cart.filter((item) => item.id !== productId);
  setCart(newCart);
  return newCart;
};

// 6. Vaciar carrito
export const clearCart = () => {
  localStorage.removeItem('cart');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event("storage"));
  }
};