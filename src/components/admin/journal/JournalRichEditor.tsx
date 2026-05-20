"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import clsx from "clsx";
import { Bold, Italic, List, ListOrdered, Quote, Heading2, Heading3, Image as ImageIcon } from "lucide-react";

/**
 * Many apps (Word, browsers, email) put copied text in `<blockquote>`. TipTap would
 * faithfully paste that — showing the gold quote bar even when the user only wanted plain text.
 * Unwrap blockquotes so paste lands as normal paragraphs; users can still use the Quote toolbar.
 */
function unwrapBlockquotesInPastedHtml(html: string): string {
  if (typeof document === "undefined") return html;
  if (!html.toLowerCase().includes("blockquote")) return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  let bq: Element | null;
  while ((bq = div.querySelector("blockquote"))) {
    const parent = bq.parentNode;
    if (!parent) break;
    while (bq.firstChild) {
      parent.insertBefore(bq.firstChild, bq);
    }
    parent.removeChild(bq);
  }
  return div.innerHTML;
}

/** Reliable “inside node” check for toolbar active state (same idea as blockquote). */
function hasAncestorNode(state: EditorState, typeName: string): boolean {
  const { $from, $to } = state.selection;
  const walk = (pos: typeof $from) => {
    for (let d = pos.depth; d > 0; d--) {
      if (pos.node(d).type.name === typeName) return true;
    }
    return false;
  };
  return walk($from) || walk($to);
}

function hasBlockquoteInState(state: EditorState): boolean {
  return hasAncestorNode(state, "blockquote");
}

/** Remove blockquote wrapper(s) by replacing the node with its children — works when `lift` fails on full selections. */
function unwrapBlockquotesAroundSelection(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined): boolean {
  let tr = state.tr;
  let changed = false;
  while (true) {
    const { $from } = tr.selection;
    let bqDepth = -1;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === "blockquote") {
        bqDepth = d;
        break;
      }
    }
    if (bqDepth < 0) break;
    const start = $from.before(bqDepth);
    const end = $from.after(bqDepth);
    const bq = $from.node(bqDepth);
    tr = tr.replaceWith(start, end, bq.content);
    changed = true;
  }
  if (!changed) return false;
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Called with selected file; should return a public URL to insert */
  onUploadImage?: (file: File) => Promise<string | null>;
  /** Denser chrome + shorter min-height for admin article forms */
  compact?: boolean;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  onMouseDownCapture,
  title,
  children,
  compact,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Runs in capture phase (before blur) — use to snapshot editor selection */
  onMouseDownCapture?: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const isToggle = active !== undefined;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseDownCapture={onMouseDownCapture}
      title={title}
      aria-label={title}
      {...(isToggle ? { "aria-pressed": active } : {})}
      className={clsx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-lg border text-[10px] transition-all duration-150",
        "touch-manipulation [-webkit-tap-highlight-color:transparent]",
        compact
          ? "min-h-11 min-w-11 px-2 py-2 sm:min-h-10 sm:min-w-10 sm:px-2 sm:py-1.5"
          : "min-h-11 min-w-11 rounded-lg px-2.5 py-2 text-xs sm:min-h-10 sm:min-w-10 sm:px-2 sm:py-2",
        active
          ? "z-[1] border-luxury-gold/55 bg-gradient-to-b from-luxury-gold/30 to-luxury-gold/12 text-[#f5e6a8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(212,175,55,0.25)] ring-2 ring-luxury-gold/25"
          : "border-white/12 bg-white/[0.06] text-white/75 hover:border-white/20 hover:bg-white/12 hover:text-white active:scale-[0.96]",
        "pointer-events-auto",
        disabled ? "pointer-events-none opacity-45" : "cursor-pointer"
      )}
      /**
       * Keep selection in the editor while using the toolbar. Use `mousedown` only — `preventDefault`
       * on `pointerdown` can swallow the following `click` on some touch browsers, so buttons feel dead.
       */
      onMouseDown={(e) => {
        if (disabled) return;
        if (e.button === 0) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function JournalRichEditor({
  value,
  onChange,
  placeholder = "Write content…",
  onUploadImage,
  compact = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** Selection before toolbar mousedown (capture) — restored before list/quote toggles */
  const toolbarSelRef = useRef<{ from: number; to: number } | null>(null);
  const [quoteActive, setQuoteActive] = useState(false);
  const [orderedListActive, setOrderedListActive] = useState(false);
  const [bulletListActive, setBulletListActive] = useState(false);
  /** Avoid setContent after our own onUpdate — it resets selection and makes toolbar toggles feel broken. */
  const lastEmittedHtmlRef = useRef<string | null>(null);

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
    immediatelyRender: false,
    /** Toolbar active states (bold, lists, …) must follow selection; TipTap v3 default skips rerender per transaction. */
    shouldRerenderOnTransaction: true,
    extensions,
    content: value || "",
    editorProps: {
      transformPastedHTML(html) {
        return unwrapBlockquotesInPastedHtml(html);
      },
      attributes: {
        class: compact
          ? "prose prose-invert max-w-none min-h-[120px] focus:outline-none sm:min-h-[150px] md:min-h-[170px] " +
            "prose-p:mb-2 prose-p:text-[0.8125rem] sm:prose-p:mb-2 sm:prose-p:text-sm " +
            "prose-headings:my-2 prose-headings:font-serif prose-headings:text-[0.95rem] prose-headings:text-white sm:prose-headings:text-base " +
            "prose-a:text-luxury-gold prose-a:no-underline hover:prose-a:underline " +
            /* globals.css sets p { font-weight: 300 }; "bolder" on strong is barely visible — force real bold */
            "[&_p]:font-normal [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic " +
            /* Tailwind preflight removes list markers — restore so list/quote toolbar actions look like they work */
            "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-white/55 " +
            "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:marker:text-white/55 " +
            "[&_li]:my-0.5 [&_li_p]:my-0 " +
            "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-luxury-gold/45 [&_blockquote]:bg-white/[0.04] [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:text-white/85 [&_blockquote_p]:my-0"
          : "prose prose-invert max-w-none min-h-[200px] focus:outline-none sm:min-h-[220px] " +
            "prose-p:mb-3 prose-p:text-[0.9375rem] sm:prose-p:text-base " +
            "prose-headings:font-serif prose-headings:text-white " +
            "prose-a:text-luxury-gold prose-a:no-underline hover:prose-a:underline " +
            "[&_p]:font-normal [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic " +
            "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-white/55 " +
            "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:marker:text-white/55 " +
            "[&_li]:my-0.5 [&_li_p]:my-0 " +
            "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-luxury-gold/45 [&_blockquote]:bg-white/[0.04] [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:text-white/85 [&_blockquote_p]:my-0",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
  }, [compact, extensions]);

  // Keep editor in sync for external value changes only (load post, reset). Skip when `value` is from our onUpdate.
  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (lastEmittedHtmlRef.current !== null && next === lastEmittedHtmlRef.current) {
      return;
    }
    const current = editor.getHTML();
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // Use prop `next`, not getHTML() — empty doc normalizes to <p></p> and would fight controlled "" forever.
    lastEmittedHtmlRef.current = next;
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const syncToolbarActive = () => {
      const st = editor.state;
      setQuoteActive(hasBlockquoteInState(st) || editor.isActive("blockquote"));
      setOrderedListActive(hasAncestorNode(st, "orderedList") || editor.isActive("orderedList"));
      setBulletListActive(hasAncestorNode(st, "bulletList") || editor.isActive("bulletList"));
    };
    editor.on("selectionUpdate", syncToolbarActive);
    editor.on("transaction", syncToolbarActive);
    syncToolbarActive();
    return () => {
      editor.off("selectionUpdate", syncToolbarActive);
      editor.off("transaction", syncToolbarActive);
    };
  }, [editor]);

  const captureToolbarSelection = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    toolbarSelRef.current = { from, to };
  }, [editor]);

  const applyQuoteToggle = useCallback(() => {
    if (!editor) return;
    const snap = toolbarSelRef.current;
    if (snap) {
      editor.chain().focus().setTextSelection({ from: snap.from, to: snap.to }).run();
    }
    if (hasBlockquoteInState(editor.state)) {
      editor.chain().focus().command(({ state, dispatch }) => unwrapBlockquotesAroundSelection(state, dispatch)).run();
    } else {
      editor.chain().focus().toggleBlockquote().run();
    }
  }, [editor]);

  const applyOrderedListToggle = useCallback(() => {
    if (!editor) return;
    const snap = toolbarSelRef.current;
    if (snap) {
      editor.chain().focus().setTextSelection({ from: snap.from, to: snap.to }).run();
    }
    editor.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const applyBulletListToggle = useCallback(() => {
    if (!editor) return;
    const snap = toolbarSelRef.current;
    if (snap) {
      editor.chain().focus().setTextSelection({ from: snap.from, to: snap.to }).run();
    }
    editor.chain().focus().toggleBulletList().run();
  }, [editor]);

  /**
   * Toolbar actions must use chain().focus() without a position.
   * focus("end") was moving the selection to the document end before every
   * toggle, so formatting never applied to the user's selection and felt “broken”.
   */
  type Chain = ReturnType<NonNullable<typeof editor>["chain"]>;
  const runFormat = useCallback(
    (action: (chain: Chain) => Chain) => {
      if (!editor) return;
      action(editor.chain().focus()).run();
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

  const iconCls = compact ? "h-4 w-4" : "h-[1.05rem] w-[1.05rem] sm:h-4 sm:w-4";
  const sepCls = compact ? "mx-0.5 h-6 w-px shrink-0 self-center bg-white/12 sm:h-5" : "mx-1 h-6 w-px shrink-0 self-center bg-white/12";

  if (!editor) {
    return (
      <div
        className={clsx(
          "border border-white/10 bg-white/5 text-white/50",
          compact ? "rounded-lg px-3 py-2 text-xs" : "rounded-xl px-4 py-3 text-sm"
        )}
      >
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "min-w-0 border border-white/10 bg-white/[0.03]",
        compact ? "rounded-lg sm:rounded-xl" : "rounded-xl"
      )}
    >
      <div
        className={clsx(
          "relative z-20 flex flex-nowrap items-center overflow-x-auto overscroll-x-contain border-b border-white/10 [-webkit-overflow-scrolling:touch]",
          "touch-pan-x [touch-action:pan-x_manipulation]",
          compact
            ? "gap-1.5 p-1.5 sm:flex-wrap sm:gap-2 sm:p-2 sm:touch-auto"
            : "gap-2 p-2 sm:flex-wrap sm:gap-2.5 sm:p-2.5 sm:touch-auto"
        )}
      >
        <ToolbarButton
          compact={compact}
          title="Heading 2"
          onClick={() => runFormat((ch) => ch.toggleHeading({ level: 2 }))}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className={iconCls} />
        </ToolbarButton>
        <ToolbarButton
          compact={compact}
          title="Heading 3"
          onClick={() => runFormat((ch) => ch.toggleHeading({ level: 3 }))}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className={iconCls} />
        </ToolbarButton>
        <div className={sepCls} />
        <ToolbarButton
          compact={compact}
          title="Bold"
          onClick={() => runFormat((ch) => ch.toggleBold())}
          active={editor.isActive("bold")}
        >
          <Bold className={iconCls} />
        </ToolbarButton>
        <ToolbarButton
          compact={compact}
          title="Italic"
          onClick={() => runFormat((ch) => ch.toggleItalic())}
          active={editor.isActive("italic")}
        >
          <Italic className={iconCls} />
        </ToolbarButton>
        <div className={sepCls} />
        <ToolbarButton
          compact={compact}
          title="Bullet list"
          onMouseDownCapture={captureToolbarSelection}
          onClick={() => {
            applyBulletListToggle();
            toolbarSelRef.current = null;
          }}
          active={bulletListActive}
        >
          <List className={iconCls} />
        </ToolbarButton>
        <ToolbarButton
          compact={compact}
          title="Ordered list"
          onMouseDownCapture={captureToolbarSelection}
          onClick={() => {
            applyOrderedListToggle();
            toolbarSelRef.current = null;
          }}
          active={orderedListActive}
        >
          <ListOrdered className={iconCls} />
        </ToolbarButton>
        <ToolbarButton
          compact={compact}
          title="Quote"
          onMouseDownCapture={captureToolbarSelection}
          onClick={() => {
            applyQuoteToggle();
            toolbarSelRef.current = null;
          }}
          active={quoteActive}
        >
          <Quote className={iconCls} />
        </ToolbarButton>
        {onUploadImage ? (
          <>
            <ToolbarButton compact={compact} title="Insert image" onClick={insertImageByUpload}>
              <ImageIcon className={iconCls} />
            </ToolbarButton>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </>
        ) : null}
      </div>

      <div className={clsx("relative z-0", compact ? "p-2 sm:p-2.5" : "p-3 sm:p-4")}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

