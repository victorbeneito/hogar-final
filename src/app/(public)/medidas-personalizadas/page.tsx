"use client";

import Image from "next/image";
import { useState } from "react";

export default function MedidasPersonalizadasPage() {
  const [imageZoom, setImageZoom] = useState(false);

  return (
    <main className="min-h-screen bg-fondo dark:bg-darkBg px-4 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
        {/* Título */}
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 dark:text-white">
          Medidas Personalizadas
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-300 mb-12">
          Estores Digitales a tu medida exacta
        </p>

        {/* Sección Principal */}
        <div className="bg-white dark:bg-darkNavBg rounded-lg shadow-lg p-8 md:p-12 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 dark:text-white">
            ¿Cómo solicitar tu medida personalizada?
          </h2>

          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed text-lg">
            En <strong>El Hogar de tus Sueños</strong>, contamos con estores digitales de alta calidad en dimensiones
            estándar. Sin embargo, si necesitas medidas personalizadas, puedes solicitar un ajuste especial durante
            el proceso de compra.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-3">
              ℹ️ ¿Por qué pueden necesitarse medidas personalizadas?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Nuestros <strong>Estores Enrollables con Estampación Digital</strong> vienen en dos medidas de largo estándar
              (180cm y 250cm). Puede que necesites una medida diferente por las siguientes razones:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-3 font-bold">•</span>
                <span>Tienes una ventana o puerta con dimensiones personalizadas</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-3 font-bold">•</span>
                <span>Hay obstáculos en la parte inferior (mesa, radiador, etc.) que impiden desplegar completamente el estor</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-3 font-bold">•</span>
                <span>Necesitas que el dibujo se vea en su totalidad cuando el estor esté completamente desplegado</span>
              </li>
            </ul>
          </div>

          {/* Medidas Estándar */}
          <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4 dark:text-white">📏 Medidas Estándar Disponibles</h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-center">
                <span className="text-primary dark:text-accent mr-3 font-bold">•</span>
                <span><strong>Ancho:</strong> 80cm a 200cm</span>
              </li>
              <li className="flex items-center">
                <span className="text-primary dark:text-accent mr-3 font-bold">•</span>
                <span><strong>Alto para ventanas:</strong> 180cm</span>
              </li>
              <li className="flex items-center">
                <span className="text-primary dark:text-accent mr-3 font-bold">•</span>
                <span><strong>Alto para puertas:</strong> 250cm</span>
              </li>
            </ul>
          </div>

          {/* ADVERTENCIA IMPORTANTE sobre mecanismos */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-3 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              ⚠️ MUY IMPORTANTE: Comprensión de Medidas
            </h3>
            <p className="text-red-900 dark:text-red-200 font-semibold mb-3">
              La medida total que especifiques INCLUYE LOS MECANISMOS del estor.
            </p>
            <div className="bg-white dark:bg-red-900/30 rounded p-4 border border-red-200 dark:border-red-700">
              <p className="text-red-900 dark:text-red-100 mb-3">
                Esto es fundamental para el correcto funcionamiento del estor:
              </p>
              <ul className="space-y-2 text-red-900 dark:text-red-100 text-sm">
                <li className="flex items-start">
                  <span className="font-bold mr-2">•</span>
                  <span><strong>Ancho total del estor:</strong> Es la medida que especifiques (incluyendo mecanismos laterales)</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">•</span>
                  <span><strong>Ancho de la tela estampada:</strong> Será 3cm menor que el ancho total (1.5cm menos en cada lateral)</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">•</span>
                  <span><strong>Razón:</strong> Esos 3cm de diferencia (1.5cm por cada lado) son necesarios para que la tela no roce con los mecanismos cuando el estor sube y baja</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">•</span>
                  <span><strong>Importancia:</strong> Si la tela roza los mecanismos, se deteriorará rápidamente</span>
                </li>
              </ul>
            </div>
            <p className="text-red-900 dark:text-red-200 text-sm mt-3 font-semibold">
              Ejemplo: Si tu ventana mide 150cm de ancho, debes solicitar un estor de 150cm total.
              La tela estampada tendrá 147cm (150cm - 3cm).
            </p>
          </div>

          {/* Instrucciones Paso a Paso */}
          <h3 className="text-2xl font-bold mb-6 dark:text-white">📋 Instrucciones Paso a Paso</h3>

          <div className="space-y-8">
            {/* Paso 1 */}
            <div className="border-l-4 border-primary dark:border-accent pl-6">
              <div className="flex items-center mb-3">
                <div className="bg-primary dark:bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-3">
                  1
                </div>
                <h4 className="text-xl font-bold dark:text-white">Elige el tamaño base según tu medida de largo</h4>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                El proveedor solo dispone de dos medidas de largo estándar. Debes elegir la que mejor se adapte a tu necesidad:
              </p>

              <div className="bg-white dark:bg-gray-700 rounded p-4 space-y-4 mb-4">
                <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                  <div className="flex items-start">
                    <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 mt-1">
                      180cm
                    </span>
                    <div>
                      <h5 className="font-bold text-gray-900 dark:text-white mb-2">Si tu medida de largo es MENOR o igual a 180cm</h5>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        Elige el <strong>estor de 180cm</strong>. El proveedor lo acortará hasta tu medida exacta.
                        Esta opción es ideal si tu ventana mide 180cm o menos de largo.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start">
                    <span className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 mt-1">
                      250cm
                    </span>
                    <div>
                      <h5 className="font-bold text-gray-900 dark:text-white mb-2">Si tu medida de largo está entre 181cm y 249cm</h5>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        Elige el <strong>estor de 250cm</strong>. El proveedor lo acortará hasta tu medida exacta.
                        Esta opción es perfecta si tu ventana o puerta mide más de 180cm pero menos de 250cm de largo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-4">
                <p className="text-amber-900 dark:text-amber-100 text-sm">
                  <strong>⚠️ Importante:</strong> Es fundamental que elijas la medida correcta. Si tienes obstáculos bajo
                  la ventana (mesa, radiador, etc.) o si el dibujo del estor necesita verse completamente desplegado,
                  comunícalo en los comentarios del pedido para que el proveedor ajuste correctamente la medida.
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="border-l-4 border-primary dark:border-accent pl-6">
              <div className="flex items-center mb-3">
                <div className="bg-primary dark:bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-3">
                  2
                </div>
                <h4 className="text-xl font-bold dark:text-white">Completa tu pedido</h4>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Durante el proceso de compra, después de completar tus datos personales y seleccionar el método de envío,
                encontrarás un campo de comentarios en la sección de "Método de envío".
              </p>
            </div>

            {/* Paso 3 */}
            <div className="border-l-4 border-primary dark:border-accent pl-6">
              <div className="flex items-center mb-3">
                <div className="bg-primary dark:bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-3">
                  3
                </div>
                <h4 className="text-xl font-bold dark:text-white">Indica tus medidas personalizadas en los comentarios</h4>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                En el campo de comentarios, especifica las dimensiones exactas que necesitas. Incluye toda la información relevante:
              </p>

              <div className="bg-white dark:bg-gray-700 rounded p-4 mb-4 space-y-4">
                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white mb-2">Información a proporcionar:</h5>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                    <li className="flex items-start">
                      <span className="text-primary dark:text-accent mr-2">✓</span>
                      <span><strong>Ancho exacto:</strong> en centímetros (ej: 150cm)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary dark:text-accent mr-2">✓</span>
                      <span><strong>Largo exacto:</strong> en centímetros (ej: 200cm)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary dark:text-accent mr-2">✓</span>
                      <span><strong>Obstáculos:</strong> menciona si hay radiador, mesa u otros obstáculos bajo la ventana</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary dark:text-accent mr-2">✓</span>
                      <span><strong>Tipo de ventana:</strong> ventana, puerta o tipo específico</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h5 className="font-bold text-gray-900 dark:text-white mb-2">Ejemplo de comentario:</h5>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                    <p className="text-gray-700 dark:text-gray-300 text-sm italic">
                      "Medidas personalizadas para estor enrollable: Ancho 150cm, Largo 200cm.
                      Hay un radiador bajo la ventana, por favor ajustar para que el estor no toque el radiador.
                      Es una ventana de dormitorio."
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300">
                Te mostramos dónde encontrar este campo de comentarios en la siguiente imagen:
              </p>
            </div>
          </div>

          {/* Imagen del comentario con zoom */}
          <div className="my-12 bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex justify-center">
              <button
                onClick={() => setImageZoom(true)}
                className="relative group cursor-zoom-in"
                title="Haz clic para ampliar la imagen"
              >
                <Image
                  src="/img/enviar-comentario-pedido.png"
                  alt="Campo de comentarios para medidas personalizadas"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg max-w-full h-auto transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg flex items-center justify-center transition-all">
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                    <span className="text-sm mt-2 block">Ampliar imagen</span>
                  </div>
                </div>
              </button>
            </div>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-4 text-sm">
              Campo de comentarios donde especificar tus medidas personalizadas (haz clic para ampliar)
            </p>
          </div>

          {/* Modal de zoom */}
          {imageZoom && (
            <div
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setImageZoom(false)}
            >
              <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setImageZoom(false)}
                  className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                  title="Cerrar (ESC)"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <Image
                  src="/img/enviar-comentario-pedido.png"
                  alt="Campo de comentarios ampliado"
                  width={1000}
                  height={700}
                  className="rounded-lg shadow-2xl w-full h-auto"
                />
              </div>
            </div>
          )}

          {/* Información de Contacto */}
          <div className="bg-gradient-to-r from-primary to-blue-600 dark:from-accent dark:to-blue-500 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              ¿Necesitas ayuda?
            </h3>
            <p className="text-white mb-6">
              Si tienes dudas sobre cómo solicitar tus medidas personalizadas, contáctanos directamente:
            </p>
            <div className="space-y-2 text-white mb-6">
              <p className="text-lg">
                📞 <strong>684 004 525</strong> o <strong>96 115 4226</strong>
              </p>
              <p className="text-lg">
                ✉️ <strong>info@elhogardetusuenos.com</strong>
              </p>
            </div>
            <a
              href="mailto:info@elhogardetusuenos.com"
              className="inline-block bg-white text-primary dark:text-accent font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Enviar Consulta
            </a>
          </div>

          {/* Notas importantes */}
          <div className="mt-12 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-6 rounded">
            <h4 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-3">📌 Notas Importantes sobre Medidas Personalizadas</h4>
            <ul className="space-y-3 text-amber-900 dark:text-amber-100">
              <li className="flex items-start">
                <span className="mr-3 text-lg">✓</span>
                <span><strong>Medidas exactas:</strong> Proporciona las medidas en centímetros. El proveedor solo tiene 180cm y 250cm, así que debes elegir la que mejor se ajuste a tu necesidad.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-lg">✓</span>
                <span><strong>Información de obstáculos:</strong> Si hay radiadores, mesas u otros obstáculos bajo la ventana, menciónalo claramente para que el proveedor ajuste la medida correctamente.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-lg">✓</span>
                <span><strong>Visibilidad del diseño:</strong> Asegúrate de que el estor pueda desplegarse completamente y se vea el estampado digital en su totalidad. Comunica cualquier restricción de espacio.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-lg">✓</span>
                <span><strong>Confirmación del proveedor:</strong> El proveedor se pondrá en contacto contigo para confirmar las medidas y ajustar el presupuesto si es necesario.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-lg">✓</span>
                <span><strong>Tiempo de fabricación:</strong> Los estores personalizados pueden tener un tiempo de fabricación adicional (7-15 días hábiles).</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-lg">✓</span>
                <span><strong>Medidas extremas:</strong> Para medidas fuera de los rangos estándar, consúltanos antes de realizar el pedido contactando directamente con nuestro equipo.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
