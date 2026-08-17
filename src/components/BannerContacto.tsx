import { Mail, Phone, Smartphone } from "lucide-react";

/* Colores extraídos del banner original (banner-dudas.jpg).

   El azul se actualizó junto al de la marca (#6BAEC9 → #377A95, ver
   tailwind.config.js). Va escrito a mano y no como clase de Tailwind, así que si un
   día se vuelve a tocar el azul de la casa hay que acordarse de este fichero: son
   dos azules uno al lado del otro en la misma cabecera y si no coinciden se nota.

   De paso mejora la lectura del propio banner: el amarillo pasa de 2,00:1 a 3,89:1
   y el texto blanco de 2,46:1 a 4,79:1. */
const AZUL = "#377A95";
const AMARILLO = "#FFEA2E";

const TELEFONO_FIJO = "961154226";
const TELEFONO_MOVIL = "684004525";
const EMAIL = "info@elhogardetusuenos.com";

export default function BannerContacto() {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-4 lg:gap-8 h-24 lg:h-28 px-5 lg:px-8 rounded-lg shadow-sm"
      style={{ backgroundColor: AZUL }}
    >
      {/* --- Bloque 1: Reclamo (no clicable) --- */}
      <div className="leading-tight">
        <p
          className="font-extrabold text-sm lg:text-lg"
          style={{ color: AMARILLO }}
        >
          Dudas, consultas...
        </p>
        <p className="font-extrabold text-sm lg:text-lg text-white">
          ESTAMOS PARA AYUDARTE
        </p>
      </div>

      {/* --- Bloque 2: Contactos clicables --- */}
      <div className="flex flex-col gap-0.5">
        {/* Teléfono fijo → llamada */}
        <a
          href={`tel:+34${TELEFONO_FIJO}`}
          aria-label={`Llamar al teléfono fijo ${TELEFONO_FIJO}`}
          title="Llamar al teléfono fijo"
          className="group flex items-center gap-2 rounded px-2 py-0.5 -mx-2 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Phone className="w-4 h-4 flex-shrink-0" style={{ color: AMARILLO }} />
          <span
            className="font-extrabold text-sm lg:text-base group-hover:underline"
            style={{ color: AMARILLO }}
          >
            {TELEFONO_FIJO}
          </span>
        </a>

        {/* Teléfono móvil → llamada (WhatsApp ya tiene su botón flotante) */}
        <a
          href={`tel:+34${TELEFONO_MOVIL}`}
          aria-label={`Llamar al teléfono móvil ${TELEFONO_MOVIL}`}
          title="Llamar al teléfono móvil"
          className="group flex items-center gap-2 rounded px-2 py-0.5 -mx-2 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Smartphone className="w-4 h-4 flex-shrink-0" style={{ color: AMARILLO }} />
          <span
            className="font-extrabold text-sm lg:text-base group-hover:underline"
            style={{ color: AMARILLO }}
          >
            {TELEFONO_MOVIL}
          </span>
        </a>

        {/* Email → cliente de correo */}
        <a
          href={`mailto:${EMAIL}?subject=${encodeURIComponent("Dudas y consultas")}`}
          aria-label={`Enviar un correo a ${EMAIL}`}
          title="Enviarnos un correo"
          className="group flex items-center gap-2 rounded px-2 py-0.5 -mx-2 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Mail className="w-4 h-4 flex-shrink-0" style={{ color: AMARILLO }} />
          <span
            className="font-extrabold text-xs lg:text-sm group-hover:underline"
            style={{ color: AMARILLO }}
          >
            {EMAIL}
          </span>
        </a>
      </div>
    </div>
  );
}
