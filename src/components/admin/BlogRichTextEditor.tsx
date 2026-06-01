"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { useEffect, useCallback } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  minHeight?: string;
};

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];
const COLORS = ["#000000", "#374151", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];

export default function BlogRichTextEditor({ value, onChange, minHeight = "400px" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 underline" } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL de la imagen:");
    if (url?.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
        active
          ? "bg-[#3498db] text-white"
          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        {/* Deshacer / Rehacer */}
        <ToolBtn title="Deshacer" onClick={() => editor.chain().focus().undo().run()}>↩</ToolBtn>
        <ToolBtn title="Rehacer" onClick={() => editor.chain().focus().redo().run()}>↪</ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1 self-center" />

        {/* Formato básico */}
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => (editor.chain().focus() as any).toggleUnderline?.().run()} title="Subrayado"><u>U</u></ToolBtn>
        <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado"><s>S</s></ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1 self-center" />

        {/* Encabezados */}
        <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título H1">H1</ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título H2">H2</ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Título H3">H3</ToolBtn>
        <ToolBtn active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} title="Párrafo">¶</ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1 self-center" />

        {/* Listas */}
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista sin orden">• Lista</ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista ordenada">1. Lista</ToolBtn>
        <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Cita">&ldquo;&rdquo;</ToolBtn>
        <ToolBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Código">&lt;/&gt;</ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1 self-center" />

        {/* Alineación */}
        <ToolBtn title="Alinear izquierda" onClick={() => (editor.chain().focus() as any).setTextAlign?.("left").run()}>⬅</ToolBtn>
        <ToolBtn title="Centrar" onClick={() => (editor.chain().focus() as any).setTextAlign?.("center").run()}>↔</ToolBtn>
        <ToolBtn title="Alinear derecha" onClick={() => (editor.chain().focus() as any).setTextAlign?.("right").run()}>➡</ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1 self-center" />

        {/* Color de texto */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Color:</span>
          <div className="flex gap-0.5">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="w-4 h-4 rounded-full border border-gray-300 hover:scale-125 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            type="button"
            title="Quitar color"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="text-xs px-1 py-0.5 bg-white border border-gray-200 rounded hover:bg-gray-50"
          >
            ✕
          </button>
        </div>

        <span className="w-px h-5 bg-gray-300 mx-1 self-center" />

        {/* Fuente */}
        <select
          title="Fuente"
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
          defaultValue=""
        >
          <option value="">Fuente</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="Trebuchet MS, sans-serif">Trebuchet</option>
        </select>

        <span className="w-px h-5 bg-gray-300 mx-1 self-center" />

        {/* Línea horizontal */}
        <ToolBtn title="Línea horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</ToolBtn>

        {/* Imagen */}
        <ToolBtn title="Insertar imagen" onClick={addImage}>🖼 Imagen</ToolBtn>

        {/* Enlace */}
        <ToolBtn active={editor.isActive("link")} title="Insertar enlace" onClick={setLink}>🔗 Link</ToolBtn>
        {editor.isActive("link") && (
          <ToolBtn title="Quitar enlace" onClick={() => editor.chain().focus().unsetLink().run()}>✕ Link</ToolBtn>
        )}

        {/* Limpiar formato */}
        <ToolBtn title="Limpiar formato" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>Limpiar</ToolBtn>
      </div>

      {/* Área de edición */}
      <EditorContent
        editor={editor}
        className="bg-white dark:bg-gray-900 dark:text-gray-100 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:bg-gray-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline"
      />

      {/* Contador de palabras */}
      <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex justify-between">
        <span>
          {editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} palabras
        </span>
        <span>{editor.getText().length} caracteres</span>
      </div>
    </div>
  );
}
