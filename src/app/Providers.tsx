"use client";

import { Toaster } from "react-hot-toast";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  );
}


// "use client";

// import { AuthProvider } from "@/context/AuthContext";
// import { ClienteAuthProvider } from "@/context/ClienteAuthContext";
// import { Toaster } from "react-hot-toast";
// import type { ReactNode } from "react";

// export function Providers({ children }: { children: ReactNode }) {
//   return (
//     <AuthProvider>
//       <ClienteAuthProvider>
//         {children}
//         <Toaster
//           position="top-right"
//           toastOptions={{
//             duration: 3000,
//             style: {
//               background: "#f9fafb",
//               color: "#111827",
//               border: "1px solid #e5e7eb",
//             },
//             success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
//             error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
//           }}
//         />
//       </ClienteAuthProvider>
//     </AuthProvider>
//   );
// }
