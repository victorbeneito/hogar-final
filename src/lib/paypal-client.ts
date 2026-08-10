import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

let _ordersController: OrdersController | null = null;

function getOrdersController(): OrdersController {
  if (_ordersController) return _ordersController;

  const MODE = process.env.PAYPAL_MODE || "sandbox";
  const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
  const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("PayPal CLIENT_ID and CLIENT_SECRET are required in environment variables");
  }

  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: CLIENT_ID,
      oAuthClientSecret: CLIENT_SECRET,
    },
    environment: MODE === "production" ? Environment.Production : Environment.Sandbox,
  });

  _ordersController = new OrdersController(client);
  return _ordersController;
}

export const ordersController = {
  createOrder: (...args: Parameters<OrdersController["createOrder"]>) =>
    getOrdersController().createOrder(...args),
  captureOrder: (...args: Parameters<OrdersController["captureOrder"]>) =>
    getOrdersController().captureOrder(...args),
  // Necesarios para el checkout express: leer la dirección que elige el
  // comprador en el popup y corregir el importe antes de cobrar.
  getOrder: (...args: Parameters<OrdersController["getOrder"]>) =>
    getOrdersController().getOrder(...args),
  patchOrder: (...args: Parameters<OrdersController["patchOrder"]>) =>
    getOrdersController().patchOrder(...args),
};
