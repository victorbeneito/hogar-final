"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,       // <<--- IMPORTANTE
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] w-full border border-[#DDC9A3]/50 rounded-2xl px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-[#DDC9A3]/50 rounded-2xl">
      {/* toolbar... */}
      <EditorContent editor={editor} />
    </div>
  );
}
