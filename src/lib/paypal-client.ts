import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

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

export const ordersController = new OrdersController(client);
