"use client";

import Script from "next/script";
import { useEffect } from "react";

const WHATSAPP_NUMBER = "34684004525";
const WHATSAPP_MESSAGE = "Hola! Tengo una consulta sobre vuestra tienda.";

export default function ChatWidgets() {
  useEffect(() => {
    // Tawk.to y Revi inyectan nodos directamente en <body>; cuando Next.js
    // reconcilia el árbol durante la navegación, removeChild falla porque
    // esos nodos externos alteran el orden de hijos que React espera.
    const origRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) return child;
      return origRemoveChild.call(this, child) as T;
    };

    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      // Silenciar ruido de Tawk.to (booleanos, strings propios del widget)
      if (typeof args[0] === "boolean") return;
      const full = args.map((a) => a?.toString() ?? "").join(" ");
      if (full.includes("tawk.to") || full.includes("twk-")) return;
      if (full.includes("Swiper container not found")) return;
      if (full.includes("[revi]")) return;
      original(...args);
    };
    return () => {
      Node.prototype.removeChild = origRemoveChild;
      console.error = original;
    };
  }, []);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <>
     {/*Tawk.to widget*/} 
      {/* <Script
        id="tawkto"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            Tawk_API.onLoad = function() {
              Tawk_API.minimize();
              if (window.location.hash === '#max-widget') {
                history.replaceState(null, '', window.location.pathname + window.location.search);
              }
            };
            (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/6867852816abb0190d2be0f7/1iva609s4';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `,
        }}
      /> */}

      {/*Nuevo Chat*/}

      <script src="https://agente.elhogardetusuenos.com/widget.js" defer></script>
      <script src="https://agente.elhogardetusuenos.com/tracker.js" defer></script>

      {/* WhatsApp floating button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 left-5 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="30"
          height="30"
          fill="white"
          aria-hidden="true"
        >
          <path d="M16 0C7.164 0 0 7.163 0 16c0 2.822.736 5.469 2.023 7.773L0 32l8.469-2.002A15.929 15.929 0 0 0 16 32c8.836 0 16-7.163 16-16S24.836 0 16 0zm0 29.25a13.22 13.22 0 0 1-6.74-1.846l-.484-.287-5.025 1.188 1.217-4.893-.316-.502A13.19 13.19 0 0 1 2.75 16C2.75 8.682 8.682 2.75 16 2.75S29.25 8.682 29.25 16 23.318 29.25 16 29.25zm7.27-9.793c-.398-.199-2.354-1.162-2.719-1.294-.365-.133-.631-.199-.897.199-.266.398-1.03 1.294-1.263 1.56-.232.265-.465.298-.863.099-.398-.199-1.682-.62-3.204-1.977-1.184-1.057-1.984-2.362-2.217-2.76-.232-.398-.025-.613.175-.811.18-.179.398-.465.597-.697.199-.232.265-.398.398-.664.133-.265.066-.497-.033-.696-.1-.199-.897-2.163-1.23-2.961-.324-.779-.653-.673-.897-.685l-.764-.013c-.266 0-.697.1-.1063.497-.365.398-1.396 1.363-1.396 3.327s1.43 3.86 1.629 4.126c.199.265 2.814 4.296 6.818 6.025.953.412 1.697.658 2.277.842.957.305 1.828.262 2.516.159.767-.114 2.354-.963 2.686-1.893.332-.93.332-1.727.232-1.893-.099-.166-.365-.265-.763-.464z" />
        </svg>
      </a>
    </>
  );
}
