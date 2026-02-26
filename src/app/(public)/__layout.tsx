import AppShell from "@/components/AppShell";
// 👇 IMPORTANTE: El CSS global se importa aquí o en el root layout. 
// Si ya está en src/app/layout.tsx, aquí NO hace falta.
// Si te da error de CSS, borra la línea del import css de este archivo.

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Simplemente envolvemos el contenido en el AppShell
    <AppShell>
      {children}
    </AppShell>
  );
}