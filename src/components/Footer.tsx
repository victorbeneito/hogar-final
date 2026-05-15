"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { CMS_PAGE_DEFINITIONS } from "@/lib/cmsConfig";

export default function Footer() {

  const pathname = usePathname();
  const { cliente } = useClienteAuth();

  if (pathname && pathname.startsWith("/admin")) {
    return null;
  }

  const accountHref = (target: string) =>
    cliente ? target : `/auth?redirect=${encodeURIComponent(target)}`;

  return (
    <footer className="bg-fondo border-t w-full py-10 px-6 dark:bg-darkNavBg dark:text-darkNavText">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-sm text-gray-700">
        <div>
          <h3 className="font-poppins font-semibold mb-2">PRODUCTOS</h3>
          <ul>
            <li className="font-orienta mb-1"><Link href="/productos" className="hover:text-hoverFooter">Ofertas</Link></li>
            <li className="font-orienta mb-1"><Link href="/productos" className="hover:text-hoverFooter">Novedades</Link></li>
            <li className="font-orienta mb-1"><Link href="/productos" className="hover:text-hoverFooter">Los más vendidos</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-poppins font-semibold mb-2">NUESTRA EMPRESA</h3>
          <ul>
            {CMS_PAGE_DEFINITIONS.map((page) => (
              <li key={page.slug} className="font-orienta mb-1">
                <Link href={page.route} className="hover:text-hoverFooter">
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-poppins font-semibold mb-2">MI CUENTA</h3>
          <ul>
            <li className="font-orienta mb-1">
              <Link href={accountHref("/account")} className="block w-full rounded-md py-0.5 hover:text-hoverFooter transition-colors">
                Página principal
              </Link>
            </li>
            <li className="font-orienta mb-1">
              <Link href={accountHref("/account/info")} className="block w-full rounded-md py-0.5 hover:text-hoverFooter transition-colors">
                Información personal
              </Link>
            </li>
            <li className="font-orienta mb-1">
              <Link href={accountHref("/account/orders")} className="block w-full rounded-md py-0.5 hover:text-hoverFooter transition-colors">
                Pedidos
              </Link>
            </li>
            <li className="font-orienta mb-1">
              <Link href={accountHref("/account/direcciones")} className="block w-full rounded-md py-0.5 hover:text-hoverFooter transition-colors">
                Direcciones
              </Link>
            </li>
            <li className="font-orienta mb-1">
              <Link href={accountHref("/account/coupons")} className="block w-full rounded-md py-0.5 hover:text-hoverFooter transition-colors">
                Cupones
              </Link>
            </li>
            <li className="font-orienta mb-1">
              <Link href={accountHref("/account/alerts")} className="block w-full rounded-md py-0.5 hover:text-hoverFooter transition-colors">
                Alertas
              </Link>
            </li>
            <li className="font-orienta mb-1">
              <Link href={accountHref("/account/cookies")} className="block w-full rounded-md py-0.5 hover:text-hoverFooter transition-colors">
                Cookies
              </Link>
            </li>
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
