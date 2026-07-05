import { useEffect, useRef, useState } from 'react'
import type { Doc, WriterAction } from '@shared/types'
import { Button } from '../../lib/ui'
import { DownloadIcon, SparkleIcon, TrashIcon } from '../../os/icons'

const AI_ACTIONS: { action: WriterAction; label: string }[] = [
  { action: 'improve', label: 'Improve' },
  { action: 'grammar', label: 'Fix grammar' },
  { action: 'shorten', label: 'Shorten' },
  { action: 'lengthen', label: 'Lengthen' },
  { action: 'professional', label: 'Professional' },
  { action: 'friendly', label: 'Friendly' },
  { action: 'continue', label: 'Continue' },
  { action: 'summarize', label: 'Summarize' }
]

const FONTS = [
  { label: 'Font', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Verdana', value: 'Verdana, sans-serif' }
]

const SIZES = [
  { label: 'Size', value: '' },
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '5' },
  { label: 'X-Large', value: '6' },
  { label: 'Huge', value: '7' }
]

export default function DocEditor({
  doc,
  onChanged,
  onDeleted
}: {
  doc: Doc
  onChanged: () => void
  onDeleted: () => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [title, setTitle] = useState(doc.title)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [words, setWords] = useState(0)
  const [aiBusy, setAiBusy] = useState<WriterAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = doc.content
      setWords(countWords(editorRef.current.innerText))
    }
    // Prefer inline CSS so colours/sizes/fonts survive the .docx export.
    try {
      document.execCommand('styleWithCSS', false, 'true')
    } catch {
      /* not supported — ignore */
    }
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scheduleSave = (nextTitle = title) => {
    setStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await window.api.documents.update(doc.id, {
        title: nextTitle,
        content: editorRef.current?.innerHTML ?? ''
      })
      setStatus('saved')
      onChanged()
    }, 700)
  }

  const onEditorInput = () => {
    if (editorRef.current) setWords(countWords(editorRef.current.innerText))
    scheduleSave()
  }

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    onEditorInput()
  }

  const promptLink = () => {
    const url = window.prompt('Link URL', 'https://')
    if (url) exec('createLink', url)
  }

  const runAI = async (action: WriterAction) => {
    const editor = editorRef.current
    if (!editor) return

    const sel = window.getSelection()
    const hasSelection =
      !!sel && sel.rangeCount > 0 && !sel.isCollapsed && editor.contains(sel.anchorNode)
    const selectedText = hasSelection ? sel!.toString() : ''
    const savedRange = hasSelection ? sel!.getRangeAt(0).cloneRange() : null
    const wholeText = editor.innerText

    const text = action === 'continue' ? wholeText : selectedText || wholeText
    if (!text.trim()) {
      setError('There’s nothing to work with yet — type or select some text first.')
      return
    }

    setAiBusy(action)
    setError(null)
    try {
      const result = await window.api.writer.enhance({ action, text })
      editor.focus()
      if (action === 'continue') {
        placeCaretAtEnd(editor)
        document.execCommand('insertText', false, (needsSpace(wholeText) ? ' ' : '') + result)
      } else if (savedRange) {
        const s = window.getSelection()
        s?.removeAllRanges()
        s?.addRange(savedRange)
        document.execCommand('insertText', false, result)
      } else {
        editor.innerHTML = toParagraphs(result)
      }
      setWords(countWords(editor.innerText))
      scheduleSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed.')
    } finally {
      setAiBusy(null)
    }
  }

  const exportDocx = async () => {
    try {
      const path = await window.api.documents.exportDocx(
        editorRef.current?.innerHTML ?? '',
        title
      )
      if (path) {
        setNote(`Exported to ${path}`)
        setTimeout(() => setNote(null), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    }
  }

  const remove = async () => {
    if (!confirm(`Delete “${title || 'this document'}”? This can’t be undone.`)) return
    await window.api.documents.remove(doc.id)
    onDeleted()
  }

  const busy = aiBusy !== null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            scheduleSave(e.target.value)
          }}
          placeholder="Untitled document"
          className="selectable min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
        />
        <span className="shrink-0 text-[11px] text-slate-500">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
        <Button variant="secondary" onClick={exportDocx} title="Export to Word (.docx)">
          <DownloadIcon width={15} height={15} /> Export .docx
        </Button>
        <Button variant="ghost" onClick={remove} title="Delete document">
          <TrashIcon width={15} height={15} />
        </Button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/5 px-4 py-1.5">
        <FmtButton label="↶" title="Undo" onClick={() => exec('undo')} />
        <FmtButton label="↷" title="Redo" onClick={() => exec('redo')} />
        <Divider />
        <ToolSelect
          options={FONTS}
          title="Font"
          onChange={(v) => v && exec('fontName', v)}
          width="w-28"
        />
        <ToolSelect
          options={SIZES}
          title="Font size"
          onChange={(v) => v && exec('fontSize', v)}
          width="w-20"
        />
        <Divider />
        <FmtButton label="B" title="Bold" bold onClick={() => exec('bold')} />
        <FmtButton label="I" title="Italic" italic onClick={() => exec('italic')} />
        <FmtButton label="U" title="Underline" underline onClick={() => exec('underline')} />
        <FmtButton label="S" title="Strikethrough" strike onClick={() => exec('strikeThrough')} />
        <ColorButton label="A" title="Text colour" onColor={(c) => exec('foreColor', c)} />
        <ColorButton
          label="🖍"
          title="Highlight"
          defaultColor="#fff59d"
          onColor={(c) => exec('hiliteColor', c)}
        />
        <Divider />
        <FmtButton label="H1" title="Heading 1" onClick={() => exec('formatBlock', 'H1')} />
        <FmtButton label="H2" title="Heading 2" onClick={() => exec('formatBlock', 'H2')} />
        <FmtButton label="¶" title="Paragraph" onClick={() => exec('formatBlock', 'P')} />
        <FmtButton label="❝" title="Quote" onClick={() => exec('formatBlock', 'BLOCKQUOTE')} />
        <Divider />
        <FmtButton label="•" title="Bulleted list" onClick={() => exec('insertUnorderedList')} />
        <FmtButton label="1." title="Numbered list" onClick={() => exec('insertOrderedList')} />
        <FmtButton label="⇤" title="Decrease indent" onClick={() => exec('outdent')} />
        <FmtButton label="⇥" title="Increase indent" onClick={() => exec('indent')} />
        <Divider />
        <FmtButton label="⯇" title="Align left" onClick={() => exec('justifyLeft')} />
        <FmtButton label="≡" title="Align centre" onClick={() => exec('justifyCenter')} />
        <FmtButton label="⯈" title="Align right" onClick={() => exec('justifyRight')} />
        <Divider />
        <FmtButton label="🔗" title="Insert link" onClick={promptLink} />
        <FmtButton label="⌫" title="Clear formatting" onClick={() => exec('removeFormat')} />
      </div>

      {/* AI toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 bg-slate-900/40 px-4 py-2">
        <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-brand-300">
          <SparkleIcon width={14} height={14} /> AI
        </span>
        {AI_ACTIONS.map(({ action, label }) => (
          <button
            key={action}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runAI(action)}
            disabled={busy}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
              aiBusy === action
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800/70 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {aiBusy === action ? 'Working…' : label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500">Select text, then pick an action</span>
      </div>

      {(error || note) && (
        <div
          className={`border-b px-4 py-2 text-xs ${
            error
              ? 'border-red-500/20 bg-red-500/10 text-red-200'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {error ?? note}
        </div>
      )}

      {/* Page */}
      <div className="flex-1 overflow-y-auto bg-slate-800/40 p-6">
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-10 shadow-window">
          <div
            ref={editorRef}
            className="doc-content selectable min-h-[40vh]"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-placeholder="Start writing, import a .docx, or paste text and polish it with AI…"
            onInput={onEditorInput}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/5 px-4 py-1.5 text-[11px] text-slate-500">
        <span>{words} word{words === 1 ? '' : 's'}</span>
        <span>AI enhancements use your Anthropic key (Settings)</span>
      </div>
    </div>
  )
}

function FmtButton({
  label,
  title,
  onClick,
  bold,
  italic,
  underline,
  strike
}: {
  label: string
  title: string
  onClick: () => void
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-7 min-w-[28px] place-items-center rounded-md px-1.5 text-xs text-slate-200 transition hover:bg-white/10 ${
        bold ? 'font-bold' : ''
      } ${italic ? 'italic' : ''} ${underline ? 'underline' : ''} ${
        strike ? 'line-through' : ''
      }`}
    >
      {label}
    </button>
  )
}

function ToolSelect({
  options,
  title,
  onChange,
  width
}: {
  options: { label: string; value: string }[]
  title: string
  onChange: (value: string) => void
  width: string
}) {
  return (
    <select
      title={title}
      defaultValue=""
      onMouseDown={(e) => {
        // Preserve the editor selection while the menu is interacted with.
        // (Chromium keeps it; this just avoids stealing focus early.)
        void e
      }}
      onChange={(e) => {
        onChange(e.target.value)
        e.currentTarget.selectedIndex = 0
      }}
      className={`h-7 ${width} rounded-md border border-white/10 bg-slate-800/70 px-1 text-xs text-slate-200 outline-none`}
    >
      {options.map((o) => (
        <option key={o.label} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function ColorButton({
  label,
  title,
  onColor,
  defaultColor = '#111827'
}: {
  label: string
  title: string
  onColor: (color: string) => void
  defaultColor?: string
}) {
  return (
    <label
      title={title}
      className="relative grid h-7 min-w-[28px] cursor-pointer place-items-center rounded-md px-1.5 text-xs text-slate-200 hover:bg-white/10"
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
      <input
        type="color"
        defaultValue={defaultColor}
        onChange={(e) => onColor(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />
}

function countWords(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

function needsSpace(text: string): boolean {
  return text.length > 0 && !/\s$/.test(text)
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}
