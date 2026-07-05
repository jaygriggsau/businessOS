import { BrowserWindow, dialog } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import mammoth from 'mammoth'
import HTMLtoDOCX from 'html-to-docx'

export interface ImportedDoc {
  title: string
  content: string
}

/**
 * Prompt the user to pick a .docx file and convert it to editor HTML via
 * mammoth. Returns null if the dialog is cancelled.
 */
export async function importDocx(): Promise<ImportedDoc | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showOpenDialog(win, {
    title: 'Import a Word document',
    filters: [{ name: 'Word documents', extensions: ['docx'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const path = result.filePaths[0]
  const buffer = await readFile(path)
  const { value: html } = await mammoth.convertToHtml({ buffer })

  return {
    title: basename(path).replace(/\.docx$/i, '') || 'Imported document',
    content: html || ''
  }
}

/**
 * Convert the editor HTML to a real .docx and save it to a user-chosen path.
 * Returns the saved path, or null if cancelled.
 */
export async function exportDocx(html: string, title: string): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const suggested = (title || 'document').replace(/[^\w\-]+/g, '_') + '.docx'

  const result = await dialog.showSaveDialog(win, {
    title: 'Export to Word',
    defaultPath: suggested,
    filters: [{ name: 'Word documents', extensions: ['docx'] }]
  })
  if (result.canceled || !result.filePath) return null

  const fullHtml =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
    escapeHtml(title || 'Document') +
    '</title></head><body>' +
    html +
    '</body></html>'

  const fileData = await HTMLtoDOCX(fullHtml, null, {
    title: title || 'Document',
    font: 'Calibri',
    fontSize: 22, // half-points → 11pt
    margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
  })

  const buffer = await toBuffer(fileData)
  await writeFile(result.filePath, buffer)
  return result.filePath
}

async function toBuffer(data: Buffer | ArrayBuffer | Blob): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (typeof (data as Blob).arrayBuffer === 'function') {
    return Buffer.from(await (data as Blob).arrayBuffer())
  }
  return Buffer.from(data as unknown as ArrayBuffer)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
