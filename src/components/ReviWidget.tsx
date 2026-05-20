"use client";

import { useEffect } from "react";

export default function ReviWidget() {
  useEffect(() => {
    // Cargar el script de Revi si no está ya cargado
    if (!window.ReviWidget) {
      const script = document.createElement("script");
      script.src = "https://widgets.revi.io/embed/widget.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="revi-widget-ezG3WXeGNw" data-revi-widget-lazy="" data-id-product="" data-lang="es"></div>
  );
}
