"use client";

import { useEffect } from "react";

export default function ReviWidget() {
  useEffect(() => {
    const w = window as any;
    if (!w.ReviWidget) {
      const script = document.createElement("script");
      script.src = "https://widgets.revi.io/embed/widget.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      const timer = setTimeout(() => {
        if (w.ReviWidget?.init) { try { w.ReviWidget.init(); } catch (_) { /* */ } }
        else if (w.__revilabsEmbeds) { try { w.__revilabsEmbeds(); } catch (_) { /* */ } }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="revi-widget-ezG3WXeGNw" data-revi-widget-lazy="" data-id-product="" data-lang="es"></div>
  );
}
