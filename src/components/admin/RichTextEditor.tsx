"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
// import TextStyle from "@tiptap/extension-text-style";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      //TextStyle,
      Image,
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {[
          { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
          { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
          { label: "S", action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
          { label: "H2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
          { label: "H3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
          { label: "• Lista", action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
          { label: "1. Lista", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            className={`px-2 py-1 text-xs rounded font-medium transition ${
              btn.active ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {btn.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL de la imagen:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          className="px-2 py-1 text-xs rounded font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
        >
          🖼 Imagen
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL del enlace:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className="px-2 py-1 text-xs rounded font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
        >
          🔗 Link
        </button>
      </div>
      {/* Área de edición */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 min-h-[200px] focus:outline-none"
      />
    </div>
  );
}
