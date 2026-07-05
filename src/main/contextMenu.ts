import { Menu, type MenuItemConstructorOptions, type WebContents } from 'electron'
import { is } from '@electron-toolkit/utils'

/**
 * Attach a native right-click context menu to a web contents:
 * spelling suggestions in editable fields, plus cut/copy/paste/select-all
 * with correct enabled state. Adds "Inspect Element" in development.
 */
export function attachContextMenu(contents: WebContents): void {
  contents.on('context-menu', (_event, params) => {
    const { editFlags, isEditable, selectionText, dictionarySuggestions, misspelledWord } =
      params
    const template: MenuItemConstructorOptions[] = []

    // Spelling suggestions for a misspelled word in an editable field.
    if (isEditable && misspelledWord && dictionarySuggestions.length > 0) {
      for (const suggestion of dictionarySuggestions.slice(0, 5)) {
        template.push({
          label: suggestion,
          click: () => contents.replaceMisspelling(suggestion)
        })
      }
      template.push(
        { type: 'separator' },
        {
          label: 'Add to dictionary',
          click: () => contents.session.addWordToSpellCheckerDictionary(misspelledWord)
        },
        { type: 'separator' }
      )
    }

    if (isEditable) {
      template.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut', enabled: editFlags.canCut },
        { role: 'copy', enabled: editFlags.canCopy },
        { role: 'paste', enabled: editFlags.canPaste },
        { role: 'selectAll' }
      )
    } else if (selectionText && selectionText.trim().length > 0) {
      template.push({ role: 'copy' }, { role: 'selectAll' })
    }

    if (is.dev) {
      if (template.length > 0) template.push({ type: 'separator' })
      template.push({
        label: 'Inspect Element',
        click: () => contents.inspectElement(params.x, params.y)
      })
    }

    if (template.length > 0) {
      Menu.buildFromTemplate(template).popup()
    }
  })
}
