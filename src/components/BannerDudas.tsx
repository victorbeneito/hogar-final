import Link from "next/link";

export default function BannerDudas() {
  return (
    <Link href="mailto:info@elhogardetusuenos.com?subject=Dudas%20y%20Consultas">
      <div className="flex-shrink-0 transform hover:scale-105 transition-transform duration-300 cursor-pointer">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-lg shadow-md overflow-hidden w-full lg:w-auto">
          <div className="px-6 py-4 lg:px-8 lg:py-5 flex items-center justify-center lg:justify-start">
            <div className="text-center lg:text-left">
              <div className="flex items-center gap-2 lg:gap-3">
                <svg
                  className="w-6 h-6 lg:w-8 lg:h-8 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-white font-bold text-sm lg:text-lg">¿Dudas?</h3>
                  <p className="text-blue-100 text-xs lg:text-sm hidden md:block">Consulta aquí</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
