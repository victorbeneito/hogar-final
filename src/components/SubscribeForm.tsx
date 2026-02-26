"use client";

import React, { useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email || !email.includes("@")) {
      setError("Por favor, introduce un correo válido.");
      return;
    }

    // Aquí iría la llamada real al backend
    setMessage("Gracias por suscribirte!");
    setEmail("");
  };

  return (
    <section className="bg-fondo w-full py-6 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-7xl mx-auto dark:bg-darkNavBg dark:text-darkNavText">
      <label htmlFor="email" className="sr-only">
        Dirección de correo electrónico
      </label>
      <input
        id="email"
        type="email"
        placeholder="Su dirección de correo electrónico"
        className="border border-gray-300 rounded px-4 py-2 max-w-md w-full"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        className="bg-primary text-white px-6 py-2 rounded font-semibold hover:bg-primaryHover transition-colors duration-300 dark:bg-secondary dark:hover:bg-botonHover dark:hover:text-secondary"
      >
        SUSCRÍBASE
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {message && <p className="text-green-600 mt-2">{message}</p>}
    </section>
  );
}
