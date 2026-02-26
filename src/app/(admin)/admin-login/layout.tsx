export const dynamic = "force-dynamic";

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout sin header, navbar ni footer
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {children}
    </div>
  );
}
