"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowRight, EllipsisVertical, Package, RefreshCw } from "lucide-react";
import { getDefaultModulesConfig, MODULES, type ModuleDefinition } from "@/lib/moduleRegistry";

type ModulesConfig = ReturnType<typeof getDefaultModulesConfig>;

export default function ModulosPage() {
  const [config, setConfig] = useState<ModulesConfig>(getDefaultModulesConfig());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/modulos/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setConfig(data.config ?? getDefaultModulesConfig());
      } catch (error: any) {
        toast.error(error.message || "No se han podido cargar los módulos");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const moduleRows = useMemo(
    () =>
      MODULES.map((module) => ({
        ...module,
        active: Boolean((config as any)[module.slug]?.activa),
        summary: summarizeModule(module, (config as any)[module.slug] ?? module.defaults),
      })),
    [config]
  );

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/modulos/configuracion", { cache: "no-store" });
      const data = await res.json();
      setConfig(data.config ?? getDefaultModulesConfig());
      toast.success("Módulos actualizados");
    } catch (error: any) {
      toast.error(error.message || "No se han podido actualizar");
    } finally {
      setLoading(false);
    }
  }

  async function resetModule(module: ModuleDefinition) {
    const nextConfig = { ...(config as any), [module.slug]: module.defaults };
    setConfig(nextConfig);

    const res = await fetch("/api/modulos/configuracion", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: nextConfig }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      toast.error(data.error || "No se ha podido reinicializar");
      return;
    }

    toast.success(`${module.name} reinicializado`);
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando módulos...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Módulos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cada módulo tiene su ficha propia. Aquí solo ves la lista y sus acciones.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/personalizar/formas-pago"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            Formas de pago
          </Link>
          <button
            onClick={reload}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {moduleRows.map((module) => (
          <article
            key={module.slug}
            className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-700 dark:text-gray-200">
                  {module.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{module.name}</h2>
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {module.category}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        module.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {module.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
                  <p className="mt-1 text-xs text-gray-400">{module.summary}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={module.route}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"
                >
                  Configurar <ArrowRight className="w-4 h-4" />
                </Link>

                <details className="relative">
                  <summary className="list-none cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <EllipsisVertical className="w-4 h-4" />
                  </summary>
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg shadow-lg overflow-hidden z-10">
                    <ActionButton href={module.route}>Configurar</ActionButton>
                    <ActionButton onClick={() => resetModule(module)}>Reinicializar</ActionButton>
                    <ActionButton onClick={() => toast("Desinstalar pendiente de implementación")}>Desinstalar</ActionButton>
                  </div>
                </details>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Notas de uso</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Los módulos de API suelen necesitar solo configurar, reinicializar y activar/desactivar. Dejaré
              desinstalar como acción preparada para más adelante.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function summarizeModule(module: ModuleDefinition, state: Record<string, any>) {
  if (module.slug === "redsys") return `Redsys · ${state.entorno} · comercio ${state.merchantCode || "sin configurar"}`;
  if (module.slug === "paypal") return `PayPal · ${state.entorno} · clientId ${state.clientId ? "configurado" : "pendiente"}`;
  if (module.slug === "revi") return `Revi · ${state.apiKey ? "API lista" : "pendiente"}`;
  if (module.slug === "seo") return `SEO · ${state.proveedor || "interno"}`;
  if (module.slug === "popups") {
    const total = Array.isArray(state.popups) ? state.popups.length : 0;
    const activos = Array.isArray(state.popups) ? state.popups.filter((p: any) => p?.activo).length : 0;
    return `Pop-ups · ${total} creado${total === 1 ? "" : "s"} · ${activos} activo${activos === 1 ? "" : "s"}`;
  }
  return `Cookies · ${state.banner ? "banner activo" : "banner oculto"}`;
}

function ActionButton({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const classes = "block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800";
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
