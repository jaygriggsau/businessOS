declare module 'html-to-docx' {
  interface DocxOptions {
    orientation?: 'portrait' | 'landscape'
    margins?: Record<string, number>
    title?: string
    font?: string
    fontSize?: number
    table?: Record<string, unknown>
    [key: string]: unknown
  }
  function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: DocxOptions,
    footerHTMLString?: string | null
  ): Promise<Buffer | ArrayBuffer | Blob>
  export default HTMLtoDOCX
}
