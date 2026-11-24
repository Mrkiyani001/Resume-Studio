import React from 'react'
import { it } from 'vitest'
import ReactPDF from '@react-pdf/renderer'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
import { PdfDocument } from '../src/components/preview/PdfDocument.jsx'

const sampleResumeData = {
  personalInfo: {
    fullName: 'FAHAD ASHFAQ',
    headline: 'Product UI/UX Designer',
    phone: '+92 325 8028150',
    email: 'fahadashfaq.sh@gmail.com',
    location: 'Lahore, Pakistan',
    linkedin: { url: 'https://linkedin.com/in/fahadashfaq-ux', displayText: 'linkedin.com/in/fahadashfaq-ux', isVisible: true },
    portfolio: { url: 'https://fahadux.com', displayText: 'Portfolio', isVisible: true },
  },
  summary: 'Mid-level Product UI/UX Designer with 2.5 years of experience...',
  workExperiences: [],
  skills: [],
  education: [],
  additionalSections: []
}

it('renders actual PdfDocument and analyzes text layout', async () => {
  const outputPath = path.resolve(__dirname, 'actual_doc.pdf')
  await ReactPDF.renderToFile(React.createElement(PdfDocument, { resumeData: sampleResumeData }), outputPath)
  console.log('Saved actual_doc.pdf to:', outputPath)

  const buf = fs.readFileSync(outputPath)
  let idx = 0
  while ((idx = buf.indexOf(Buffer.from('stream'), idx)) !== -1) {
    let start = idx + 6
    if (buf[start] === 0x0d) start++
    if (buf[start] === 0x0a) start++
    const end = buf.indexOf(Buffer.from('endstream'), start)
    if (end !== -1) {
      let cleanEnd = end
      while (buf[cleanEnd - 1] === 0x0a || buf[cleanEnd - 1] === 0x0d) cleanEnd--
      const stream = buf.subarray(start, cleanEnd)
      try {
        const decompressed = zlib.inflateSync(stream).toString('latin1')
        if (decompressed.includes('BT')) {
          console.log('--- FOUND TEXT STREAM IN ACTUAL DOC ---')
          console.log(decompressed)
        }
      } catch (e) {}
    }
    idx = start
  }
})
