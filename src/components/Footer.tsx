"use client";
import { usePathname } from "next/navigation";

export default function Footer() {

  const pathname = usePathname();

  if (pathname && pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-fondo border-t w-full py-10 px-6 dark:bg-darkNavBg dark:text-darkNavText">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-sm text-gray-700">
        <div>
          <h3 className="font-poppins font-semibold mb-2">PRODUCTOS</h3>
          <ul>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Ofertas</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Novedades</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Los más vendidos</li>
          </ul>
        </div>

        <div>
          <h3 className="font-poppins font-semibold mb-2">NUESTRA EMPRESA</h3>
          <ul>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Aviso legal</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Términos y condiciones</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Preguntas frecuentes</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Política de Cookies</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Política privacidad</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Formulario de desistimiento</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Contacto con nosotros</li>
          </ul>
        </div>

        <div>
          <h3 className="font-poppins font-semibold mb-2">MI CUENTA</h3>
          <ul>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Información personal</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Pedidos</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Facturas por abono</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Direcciones</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Vales</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Mis alertas</li>
            <li className="font-orienta mb-1 cursor-pointer hover:text-hoverFooter">Tu configuración de cookies</li>
          </ul>
        </div>

        <div>
          <h3 className="font-poppins font-semibold mb-2">INFORMACIÓN DE LA TIENDA</h3>
          <address className="font-orienta not-italic text-gray-600 leading-relaxed">
            El hogar de tus sueños<br />
            España<br />
            Valencia<br />
            Llámenos: 961 154 226 - 684 004 525<br />
            Envíenos un correo electrónico: <a href="mailto:info@elhogardetsuenos.com" className="text-primary dark:text-gray-700 font-semibold">info@elhogardetsuenos.com</a>
          </address>
        </div>
      </div>
    </footer>
  );
}
