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

  // Load the document body once when this editor mounts (keyed by doc.id).
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = doc.content
      setWords(countWords(editorRef.current.innerText))
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

  // Formatting commands keep the editor focused via preventDefault on mousedown.
  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    onEditorInput()
  }

  const runAI = async (action: WriterAction) => {
    const editor = editorRef.current
    if (!editor) return

    const sel = window.getSelection()
    const hasSelection =
      !!sel &&
      sel.rangeCount > 0 &&
      !sel.isCollapsed &&
      editor.contains(sel.anchorNode)
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

  const exportWord = () => {
    const body = editorRef.current?.innerHTML ?? ''
    const safeTitle = escapeHtml(title || 'document')
    const html =
      `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
      `xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"><title>${safeTitle}</title></head><body>${body}</body></html>`
    const blob = new Blob(['﻿', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title || 'document').replace(/[^\w\-]+/g, '_')}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const remove = async () => {
    if (!confirm(`Delete “${title || 'this document'}”? This can’t be undone.`)) return
    await window.api.documents.remove(doc.id)
    onDeleted()
  }

  const busy = aiBusy !== null

  return (
    <div className="flex h-full flex-col">
      {/* Header: title + actions */}
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
        <Button variant="secondary" onClick={exportWord} title="Export to Word (.doc)">
          <DownloadIcon width={15} height={15} /> Word
        </Button>
        <Button variant="ghost" onClick={remove} title="Delete document">
          <TrashIcon width={15} height={15} />
        </Button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/5 px-4 py-1.5">
        <FmtButton label="B" title="Bold" bold onClick={() => exec('bold')} />
        <FmtButton label="I" title="Italic" italic onClick={() => exec('italic')} />
        <FmtButton label="U" title="Underline" underline onClick={() => exec('underline')} />
        <Divider />
        <FmtButton label="H1" title="Heading 1" onClick={() => exec('formatBlock', 'H1')} />
        <FmtButton label="H2" title="Heading 2" onClick={() => exec('formatBlock', 'H2')} />
        <FmtButton label="¶" title="Paragraph" onClick={() => exec('formatBlock', 'P')} />
        <Divider />
        <FmtButton label="•" title="Bulleted list" onClick={() => exec('insertUnorderedList')} />
        <FmtButton label="1." title="Numbered list" onClick={() => exec('insertOrderedList')} />
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

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          {error}
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
            data-placeholder="Start writing, or paste text and polish it with AI…"
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
  underline
}: {
  label: string
  title: string
  onClick: () => void
  bold?: boolean
  italic?: boolean
  underline?: boolean
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-7 min-w-[28px] place-items-center rounded-md px-1.5 text-xs text-slate-200 transition hover:bg-white/10 ${
        bold ? 'font-bold' : ''
      } ${italic ? 'italic' : ''} ${underline ? 'underline' : ''}`}
    >
      {label}
    </button>
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

/** Turn plain text (with blank-line paragraph breaks) into simple HTML. */
function toParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}
