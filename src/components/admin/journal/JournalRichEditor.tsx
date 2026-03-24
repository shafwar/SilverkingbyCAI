"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link2, List, ListOrdered, Quote, Heading2, Heading3, Image as ImageIcon } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Called with selected file; should return a public URL to insert */
  onUploadImage?: (file: File) => Promise<string | null>;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "inline-flex items-center justify-center rounded-md border px-2 py-1.5 text-xs transition-colors",
        active ? "border-luxury-gold/40 bg-luxury-gold/15 text-luxury-gold" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
        // Ensure toolbar is always clickable when not disabled.
        "pointer-events-auto",
        disabled ? "opacity-50 pointer-events-none" : "",
      ].join(" ")}
      // Prevent losing editor focus before tiptap runs the command chain.
      onMouseDown={(e) => {
        if (disabled) return;
        e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function JournalRichEditor({ value, onChange, placeholder = "Write content…", onUploadImage }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
          class: "text-luxury-gold hover:underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full rounded-xl border border-white/10",
          loading: "lazy",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    extensions,
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[220px] focus:outline-none " +
          "prose-p:mb-3 prose-headings:font-serif prose-headings:text-white " +
          "prose-a:text-luxury-gold prose-a:no-underline hover:prose-a:underline",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep editor in sync when switching language tabs
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  const promptLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url == null) return;
    const clean = url.trim();
    if (!clean) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: clean }).run();
  }, [editor]);

  const runCommand = useCallback(
    (runner: () => boolean) => {
      if (!editor) return;
      const ok = runner();
      if (ok) return;
      // Fallback when current selection is an atom node (e.g. image)
      runner();
    },
    [editor]
  );

  const insertImageByUpload = useCallback(async () => {
    if (!editor || !onUploadImage) return;
    fileInputRef.current?.click();
  }, [editor, onUploadImage]);

  const onPickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      e.target.value = "";
      if (!file || !editor || !onUploadImage) return;
      const url = await onUploadImage(file);
      if (!url) return;
      editor
        .chain()
        .focus("end")
        .setImage({ src: url })
        .insertContent("<p></p>")
        .focus("end")
        .run();
    },
    [editor, onUploadImage]
  );

  if (!editor) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-2 relative z-20">
        <ToolbarButton
          title="Heading 2"
          onClick={() => runCommand(() => editor.chain().focus("end").toggleHeading({ level: 2 }).run())}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          onClick={() => runCommand(() => editor.chain().focus("end").toggleHeading({ level: 3 }).run())}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <ToolbarButton
          title="Bold"
          onClick={() => runCommand(() => editor.chain().focus("end").toggleBold().run())}
          active={editor.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          onClick={() => runCommand(() => editor.chain().focus("end").toggleItalic().run())}
          active={editor.isActive("italic")}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <ToolbarButton
          title="Bullet list"
          onClick={() => runCommand(() => editor.chain().focus("end").toggleBulletList().run())}
          active={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered list"
          onClick={() => runCommand(() => editor.chain().focus("end").toggleOrderedList().run())}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          onClick={() => runCommand(() => editor.chain().focus("end").toggleBlockquote().run())}
          active={editor.isActive("blockquote")}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <ToolbarButton title="Link" onClick={promptLink} active={editor.isActive("link")}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title={onUploadImage ? "Insert image" : "Image upload not available"}
          onClick={insertImageByUpload}
          disabled={!onUploadImage}
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      </div>

      <div className="p-4 relative z-0">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

