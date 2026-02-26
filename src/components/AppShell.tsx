"use client";

import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
// Ya no necesitamos useState para el modo oscuro aquí

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* El Navbar ya se gestiona solo con next-themes */}
      <Navbar /> 
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// "use client";

// import Header from "@/components/Header";
// import Navbar from "@/components/Navbar";
// import Footer from "@/components/Footer";
// import { useState } from "react";

// type Categoria = {
//   id: number;
//   nombre: string;
// };

// export default function AppShell({
//   children,
//   categorias = [],
// }: {
//   children: React.ReactNode;
//   categorias?: Categoria[];
// }) {
//   const [darkMode, setDarkMode] = useState(false);

//   return (
//     <div className={`min-h-screen flex flex-col ${darkMode ? "dark" : ""}`}>
//       <Header />
//       <Navbar
//         darkMode={darkMode}
//         setDarkMode={setDarkMode}
//               />
//       <main className="flex-1 bg-gray-100 dark:bg-darkBg">{children}</main>
//       <Footer />
//     </div>
//   );
// }


// "use client";

// import React, { useEffect, useState } from "react";
// import Header from "@/components/Header";
// import Navbar from "@/components/Navbar";
// import Footer from "@/components/Footer";
// import clienteAxios from "@/lib/axiosClient";

// export default function AppShell({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [categories, setCategories] = useState<any[]>([]);e
//   const [searchQuery, setSearchQuery] = useState("");
//   const [darkMode, setDarkMode] = useState(false);

//   useEffect(() => {
//     const cargarCategorias = async () => {
//       try {
        
//         const { data } = await clienteAxios.get<any>("/categorias");
        
//         if (data.ok) setCategories(data.categorias || []);
//       } catch (error) {
//         console.error("Error cargando categorías:", error);
//       }
//     };
//     cargarCategorias();
//   }, []); 

//   const handleSearch = (q: string) => setSearchQuery(q);

//   return (
//     <div className={darkMode ? "dark min-h-screen bg-gray-100" : "min-h-screen bg-gray-100"}>
//       <Header />
//       <Navbar
//         categories={categories}
//         searchQuery={searchQuery}
//         onSearch={handleSearch}
//         darkMode={darkMode}
//         setDarkMode={setDarkMode}
//       />
//       <main className="w-full py-8 px-4">{children}</main>
//       <Footer />
//     </div>
//   );
// }


// // src/app/(admin)/layout.tsx
// "use client";

// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";

// export default function AdminLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const { user } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!user) {
//       router.replace("/login"); // o la ruta de login que tengas para admin
//     }
//   }, [user, router]);

//   if (!user) {
//     return <div className="p-8">Redirigiendo al login...</div>;
//   }

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* aquí tu header propio del panel si quieres */}
//       <main className="max-w-6xl mx-auto py-8 px-4">{children}</main>
//     </div>
//   );
// }

