import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PdfDocument } from '../src/components/preview/PdfDocument.jsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
};

async function main() {
  const outputPath = path.resolve(__dirname, 'actual_doc.pdf');
  await ReactPDF.renderToFile(React.createElement(PdfDocument, { resumeData: sampleResumeData }), outputPath);
  console.log('Saved actual_doc.pdf to:', outputPath);
}

main().catch(console.error);
