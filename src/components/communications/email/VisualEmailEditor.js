"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  LinkIcon,
  ListBulletIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { DOOR_ACCESS_EMAIL_VARIABLES } from "./doorAccessEmailContent";
import {
  createVisualEmailExtensions,
  findVisualEmailBlock,
  updateVisualEmailBlockStyle,
} from "./visualEmailExtensions";
import {
  isVisualEmailLinkAllowed,
  prepareVisualEmailHtml,
} from "./visualEmailHtml";
import styles from "./VisualEmailEditor.module.css";

const cx = (...values) => values.filter(Boolean).join(" ");
const controlClass =
  "min-h-11 rounded-lg border border-line bg-white px-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:opacity-40";
const actionClass =
  "min-h-11 rounded-lg px-3 text-xs font-semibold text-cobalt-700 hover:bg-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:opacity-40";

function ToolbarButton({
  label,
  active = false,
  disabled,
  onClick,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:opacity-40",
        active
          ? "border-cobalt-200 bg-cobalt-50 text-cobalt-700"
          : "border-transparent text-ink-soft hover:bg-sand-50",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function AlignIcon({ align }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M3 4h14M3 12h14" />
      <path
        d={
          align === "left"
            ? "M3 8h9M3 16h9"
            : align === "right"
              ? "M8 8h9M8 16h9"
              : "M6 8h8M6 16h8"
        }
      />
    </svg>
  );
}

function colorValue(value, fallback) {
  if (/^#[\da-f]{6}$/i.test(value || "")) return value;
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(value || "");
  return rgb
    ? `#${rgb
        .slice(1)
        .map((channel) =>
          Math.min(255, Number(channel)).toString(16).padStart(2, "0"),
        )
        .join("")}`
    : fallback;
}

export default function VisualEmailEditor({
  value,
  onChange,
  disabled = false,
  ariaLabel,
  onFocus,
  editorRef,
  invalid = false,
  variableNames = DOOR_ACCESS_EMAIL_VARIABLES,
}) {
  const t = useTranslations("EmailAutomations.visualEditor");
  const controlsId = useId();
  const callbacks = useRef({ onChange, onFocus });
  const lastValue = useRef(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const extensions = useMemo(
    () =>
      createVisualEmailExtensions({
        tokenClassName: styles.variable,
        variableNames,
      }),
    [variableNames],
  );

  useEffect(() => {
    callbacks.current = { onChange, onFocus };
  }, [onChange, onFocus]);

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: !disabled,
    content: prepareVisualEmailHtml(value || "", variableNames),
    editorProps: {
      attributes: {
        class: styles.editor,
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        "aria-invalid": invalid ? "true" : "false",
      },
      transformPastedHTML: (html) =>
        prepareVisualEmailHtml(html, variableNames),
      handleDOMEvents: {
        drop: (_view, event) => {
          if (!event.dataTransfer?.files?.length) return false;
          event.preventDefault();
          return true;
        },
      },
    },
    onFocus: () => callbacks.current.onFocus?.(),
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastValue.current = html;
      callbacks.current.onChange?.(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled, false);
    editor.view.dom.setAttribute("aria-readonly", disabled ? "true" : "false");
    editor.view.dom.setAttribute("aria-invalid", invalid ? "true" : "false");
    editor.view.dom.setAttribute("aria-label", ariaLabel || "");
  }, [ariaLabel, disabled, editor, invalid]);

  useEffect(() => {
    if (!editor || value === lastValue.current) return;
    lastValue.current = value;
    editor.commands.setContent(
      prepareVisualEmailHtml(value || "", variableNames),
      {
        emitUpdate: false,
      },
    );
  }, [editor, value, variableNames]);

  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => editor?.commands.focus(),
      insertText: (text) => {
        if (!editor || disabled) return false;
        const match = /^{{\s*(\w+)\s*}}$/.exec(text);
        if (match && variableNames.includes(match[1])) {
          return editor
            .chain()
            .focus()
            .insertContent({ type: "emailVariable", attrs: { name: match[1] } })
            .run();
        }
        return editor
          .chain()
          .focus()
          .insertContent({ type: "text", text: String(text) })
          .run();
      },
    }),
    [disabled, editor, variableNames],
  );

  const selection =
    useEditorState({
      editor,
      selector: ({ editor: current }) => {
        if (!current) return {};
        const block = findVisualEmailBlock(current);
        return {
          bold: current.isActive("bold"),
          italic: current.isActive("italic"),
          underline: current.isActive("underline"),
          bulletList: current.isActive("bulletList"),
          orderedList: current.isActive("orderedList"),
          link: current.isActive("link"),
          heading: current.isActive("heading")
            ? String(current.getAttributes("heading").level)
            : "body",
          fontSize: current.getAttributes("textStyle").fontSize || "",
          color: current.getAttributes("textStyle").color,
          backgroundColor: current.getAttributes("textStyle").backgroundColor,
          align:
            ["left", "center", "right"].find((align) =>
              current.isActive({ textAlign: align }),
            ) || "left",
          canUndo: current.can().undo(),
          canRedo: current.can().redo(),
          blockStyle: block?.node.attrs.emailStyle || "",
        };
      },
    }) || {};

  const unavailable = disabled || !editor;
  const run = (command) => {
    if (!unavailable) command(editor.chain().focus()).run();
  };
  const changeTextColor = (event) => {
    if (unavailable) return;
    callbacks.current.onFocus?.();
    editor.commands.setColor(event.target.value);
  };
  const changeTextBackground = (event) => {
    if (unavailable) return;
    callbacks.current.onFocus?.();
    editor.commands.setBackgroundColor(event.target.value);
  };
  const changeBlockBackground = (event) => {
    if (unavailable) return;
    callbacks.current.onFocus?.();
    updateVisualEmailBlockStyle(
      editor,
      { "background-color": event.target.value },
      { focus: false },
    );
  };
  const blockStyle = useMemo(() => {
    if (typeof document === "undefined") return {};
    const element = document.createElement("div");
    element.style.cssText = selection.blockStyle || "";
    return {
      background: element.style.backgroundColor,
      padding: element.style.padding,
    };
  }, [selection.blockStyle]);

  function openLink() {
    setLinkUrl(editor?.getAttributes("link").href || "");
    setLinkError(false);
    setLinkOpen((open) => !open);
    setBlockOpen(false);
  }

  function applyLink() {
    if (unavailable) return;
    const href = linkUrl.trim();
    if (!href || !isVisualEmailLinkAllowed(href)) {
      setLinkError(true);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  return (
    <div className={styles.workspace} data-visual-email-editor>
      <div
        role="group"
        aria-label={t("toolbar")}
        className="shrink-0 border-b border-line bg-sand-50/80 p-2"
      >
        <div className="flex flex-wrap items-center gap-1">
          <select
            aria-label={t("body")}
            disabled={unavailable}
            value={selection.heading || "body"}
            className={cx(controlClass, "max-w-32")}
            onChange={(event) =>
              run((chain) =>
                event.target.value === "body"
                  ? chain.setParagraph()
                  : chain.setHeading({ level: Number(event.target.value) }),
              )
            }
          >
            <option value="body">{t("body")}</option>
            {[1, 2, 3].map((level) => (
              <option key={level} value={level}>
                {t(`heading${level}`)}
              </option>
            ))}
            {[4, 5, 6].includes(Number(selection.heading)) ? (
              <option value={selection.heading}>H{selection.heading}</option>
            ) : null}
          </select>
          <ToolbarButton
            label={t("bold")}
            active={selection.bold}
            disabled={unavailable}
            onClick={() => run((chain) => chain.toggleBold())}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            label={t("italic")}
            active={selection.italic}
            disabled={unavailable}
            onClick={() => run((chain) => chain.toggleItalic())}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            label={t("underline")}
            active={selection.underline}
            disabled={unavailable}
            onClick={() => run((chain) => chain.toggleUnderline())}
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <select
            aria-label={t("fontSize")}
            disabled={unavailable}
            value={selection.fontSize || ""}
            className={cx(controlClass, "max-w-24")}
            onChange={(event) =>
              run((chain) =>
                event.target.value
                  ? chain.setFontSize(event.target.value)
                  : chain.unsetFontSize(),
              )
            }
          >
            <option value="">{t("defaultSize")}</option>
            {[12, 14, 16, 18, 20, 24, 28, 34].map((size) => (
              <option key={size} value={`${size}px`}>
                {size}px
              </option>
            ))}
            {selection.fontSize &&
            ![12, 14, 16, 18, 20, 24, 28, 34].some(
              (size) => `${size}px` === selection.fontSize,
            ) ? (
              <option value={selection.fontSize}>{selection.fontSize}</option>
            ) : null}
          </select>
          <label
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2"
            title={t("textColor")}
          >
            <span
              aria-hidden="true"
              className="text-sm font-bold underline decoration-2 underline-offset-4"
            >
              A
            </span>
            <input
              type="color"
              aria-label={t("textColor")}
              disabled={unavailable}
              value={colorValue(selection.color, "#302c28")}
              className="size-7 cursor-pointer border-0 bg-transparent p-0 disabled:opacity-40"
              onInput={changeTextColor}
              onChange={changeTextColor}
            />
          </label>
          <label
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2"
            title={t("textBackground")}
          >
            <PaintBrushIcon className="size-4" aria-hidden="true" />
            <input
              type="color"
              aria-label={t("textBackground")}
              disabled={unavailable}
              value={colorValue(selection.backgroundColor, "#ffffff")}
              className="size-7 cursor-pointer border-0 bg-transparent p-0 disabled:opacity-40"
              onInput={changeTextBackground}
              onChange={changeTextBackground}
            />
          </label>
          <span className="mx-1 h-5 border-l border-line" aria-hidden="true" />
          {["left", "center", "right"].map((align) => (
            <ToolbarButton
              key={align}
              label={t(`align${align[0].toUpperCase()}${align.slice(1)}`)}
              active={selection.align === align}
              disabled={unavailable}
              onClick={() => run((chain) => chain.setTextAlign(align))}
            >
              <AlignIcon align={align} />
            </ToolbarButton>
          ))}
          <ToolbarButton
            label={t("bulletList")}
            active={selection.bulletList}
            disabled={unavailable}
            onClick={() => run((chain) => chain.toggleBulletList())}
          >
            <ListBulletIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label={t("orderedList")}
            active={selection.orderedList}
            disabled={unavailable}
            onClick={() => run((chain) => chain.toggleOrderedList())}
          >
            <span aria-hidden="true" className="font-mono text-xs">
              1.
            </span>
          </ToolbarButton>
          <ToolbarButton
            label={t("link")}
            active={selection.link || linkOpen}
            disabled={unavailable}
            onClick={openLink}
            aria-expanded={linkOpen}
            aria-controls={`${controlsId}-link`}
          >
            <LinkIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label={t("blockStyle")}
            active={blockOpen}
            disabled={unavailable}
            onClick={() => {
              setBlockOpen((open) => !open);
              setLinkOpen(false);
            }}
            aria-expanded={blockOpen}
            aria-controls={`${controlsId}-block`}
          >
            <PaintBrushIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <span className="ml-auto flex">
            <ToolbarButton
              label={t("undo")}
              disabled={unavailable || !selection.canUndo}
              onClick={() => run((chain) => chain.undo())}
            >
              <ArrowUturnLeftIcon className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label={t("redo")}
              disabled={unavailable || !selection.canRedo}
              onClick={() => run((chain) => chain.redo())}
            >
              <ArrowUturnRightIcon className="size-4" aria-hidden="true" />
            </ToolbarButton>
          </span>
        </div>
        {linkOpen ? (
          <div
            id={`${controlsId}-link`}
            className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setLinkOpen(false);
                editor?.commands.focus();
              }
            }}
          >
            <label className="flex min-w-0 flex-1 basis-full flex-col gap-1 text-xs text-ink-muted sm:basis-52">
              {t("linkUrl")}
              <input
                autoFocus
                aria-invalid={linkError}
                value={linkUrl}
                placeholder={t("linkPlaceholder")}
                disabled={unavailable}
                className={cx(controlClass, "w-full")}
                onChange={(event) => {
                  setLinkUrl(event.target.value);
                  setLinkError(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
            </label>
            <button
              type="button"
              disabled={unavailable}
              className={actionClass}
              onClick={applyLink}
            >
              {t("applyLink")}
            </button>
            <button
              type="button"
              disabled={unavailable || !selection.link}
              className={actionClass}
              onClick={() => {
                run((chain) => chain.extendMarkRange("link").unsetLink());
                setLinkOpen(false);
              }}
            >
              {t("removeLink")}
            </button>
            <button
              type="button"
              className={actionClass}
              onClick={() => {
                setLinkOpen(false);
                editor?.commands.focus();
              }}
            >
              {t("cancelLink")}
            </button>
            {linkError ? (
              <p role="alert" className="basis-full text-xs text-danger">
                {t("invalidLink")}
              </p>
            ) : null}
          </div>
        ) : null}
        {blockOpen ? (
          <div
            id={`${controlsId}-block`}
            className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-2"
          >
            <label className="flex min-h-11 items-center gap-2 text-xs text-ink-muted">
              {t("blockBackground")}
              <input
                type="color"
                aria-label={t("blockBackground")}
                disabled={unavailable}
                value={colorValue(blockStyle.background, "#ffffff")}
                className="size-7 border-0 bg-transparent p-0"
                onInput={changeBlockBackground}
                onChange={changeBlockBackground}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              {t("blockPadding")}
              <select
                disabled={unavailable}
                value={blockStyle.padding || ""}
                className={controlClass}
                onChange={(event) =>
                  updateVisualEmailBlockStyle(editor, {
                    padding: event.target.value,
                  })
                }
              >
                <option value="">{t("paddingNone")}</option>
                <option value="12px">{t("paddingSmall")}</option>
                <option value="24px">{t("paddingMedium")}</option>
                <option value="36px">{t("paddingLarge")}</option>
                {blockStyle.padding &&
                !["12px", "24px", "36px"].includes(blockStyle.padding) ? (
                  <option value={blockStyle.padding}>
                    {blockStyle.padding}
                  </option>
                ) : null}
              </select>
            </label>
            <button
              type="button"
              disabled={unavailable}
              className={actionClass}
              onClick={() =>
                updateVisualEmailBlockStyle(editor, {
                  "background-color": null,
                  padding: null,
                })
              }
            >
              {t("clearBlockStyle")}
            </button>
          </div>
        ) : null}
      </div>
      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
