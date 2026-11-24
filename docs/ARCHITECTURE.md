# Resume Studio — Architecture & Technical Specifications

## 1. System Overview & Core Workflow
Resume Studio is a local-first, mobile-first Progressive Web Application (PWA) built with React (JavaScript ES2022+), ESLint, Tailwind CSS, Dexie.js (IndexedDB), and @react-pdf/renderer.

### Core Workflow:
Select master resume variant → Enter company name & job title → Create independent application copy → Paste external AI Old/New suggestions → Deterministically parse & review → Selectively accept/reject & apply → Preview & export A4 PDF → Automatically archive editable snapshot + exact PDF binary → Search & retrieve anytime.

---

## 2. Locked Core Requirements & Corrections

### 2.1 PDF Filename Convention
- **Format:** `[Full Name] - [Job Title].pdf`
- **Strict Rule:** Must **NOT** append the word "Resume".
- **Strict Rule:** Must **NEVER** contain the company name (company name is internal metadata only).

### 2.2 Bulk Parser Match Engine & UI
- **5 Match Statuses:**
  1. `Matched` (high-confidence deterministic match)
  2. `Needs review` (content matches with minor whitespace/punctuation differences)
  3. `Unmatched` (no target found in section)
  4. `Ambiguous` (multiple potential target bullets/items found)
  5. `Invalid` (malformed format or invalid section header)
- **Manual Target Picker:** Allows user to manually map any `Unmatched` or `Ambiguous` item to a specific bullet or field.
- **Snapshot & Undo:** Takes a pre-apply revision snapshot before mutating the application state; includes an **Undo Last Batch** action.
- **13 Required Unit Test Scenarios:**
  1. Exact specification fixture parsing
  2. Summary single-field replacement
  3. Work experience bullet replacement by exact match
  4. Work experience bullet addition (`Old: [None]` / `Old: `)
  5. Work experience bullet deletion (`New: [None]` / `New: `)
  6. Skills category update
  7. Education entry update
  8. Handling extra whitespace and line breaks
  9. Handling trailing punctuation differences
  10. Ambiguous match detection (duplicate bullets across roles)
  11. Unmatched bullet reporting
  12. Malformed headers rejection (`Invalid` status)
  13. Pre-apply snapshot generation and batch rollback (`Undo Last Batch`)

### 2.3 PDF Design Fidelity (.docx Reference)
- Authoritative design reference: `reference/Fahad Ashfaq - Product UX Designer 2026 .docx`.
- PDF generation extracts and matches exact values from the `.docx` XML (`word/document.xml`, `word/styles.xml`, `word/theme/theme1.xml`):
  - Margins, fonts, point sizes, line heights, spacing before/after paragraphs
  - Authoritative Navy hex color (`#1A365D` or exact theme XML color)
  - Horizontal rule / divider thickness and margins
  - Strict A4 format, selectable text, active hyperlinks, embedded local fonts in `public/fonts/`.

### 2.4 End-to-End Verification (20 Steps)
Final QA executes a 20-step verification flow:
1. PWA installation & offline readiness
2. 4 default master variants present and isolated
3. Smart Import with `reference/*.docx` extracting all structured fields
4. Unassigned content review and placement
5. Variant renaming and manual creation
6. Application creation with Company Name & Job Title
7. Auto-headline synchronization with Job Title
8. Master variant immutability verification (app edits don't touch master)
9. Individual bullet point CRUD and reordering
10. LinkedIn, Portfolio & Custom link visibility toggles
11. Sticky header real-time save state transitions (`Saving...` -> `Saved`)
12. Bulk parser fixture execution with 5-status categorization
13. Manual target mapping for ambiguous items
14. Pre-apply snapshot and batch undo verification
15. In-app PDF.js preview rendering
16. PDF export with exact filename `[Full Name] - [Job Title].pdf` (zero company name)
17. Atomic archive verification (PDF binary Blob committed in IndexedDB)
18. Viewing archived PDF displays exact stored Blob without regeneration
19. JSON & complete ZIP backup export and validated restoration
20. Storage quota & persistence (`navigator.storage.persist()`) check

---

## 3. Data Schema & Architecture

### 3.1 Link Schema
```javascript
{
  id: string,          // crypto.randomUUID()
  url: string,
  displayText: string,
  isVisible: boolean   // Controls inclusion in PDF and public view
}
```

### 3.2 Resume Data Schema
```javascript
{
  personalInfo: {
    fullName: string,
    headline: string,
    email: string,
    phone: string,
    location: string,
    linkedin: { url: string, displayText: string, isVisible: boolean },
    portfolio: { url: string, displayText: string, isVisible: boolean },
    customLinks: Array<{ id: string, url: string, displayText: string, isVisible: boolean }>
  },
  summary: string,
  workExperiences: Array<{
    id: string,
    employer: string,
    jobTitle: string,
    startDate: string,
    endDate: string,
    location: string,
    bullets: Array<{ id: string, text: string }>
  }>,
  skills: Array<{
    id: string,
    categoryName: string,
    skills: Array<{ id: string, name: string }>
  }>,
  education: Array<{
    id: string,
    institution: string,
    degree: string,
    startDate: string,
    endDate: string,
    description: string
  }>,
  additionalSections: Array<{
    id: string,
    title: string,
    isVisible: boolean,
    items: Array<{ id: string, title: string, subtitle: string, date: string, text: string }>
  }>
}
```

### 3.3 Application Schema
```javascript
{
  id: string,               // crypto.randomUUID()
  companyName: string,      // Internal archive metadata ONLY (never in PDF)
  jobTitle: string,         // Auto-populates headline, editable
  variantId: string,        // Master variant source reference
  variantName: string,      // Cached variant title
  resumeData: object,       // Independent deep-cloned resume data
  revision: number,         // Incremented on post-export edits
  createdAt: string,        // ISO string
  updatedAt: string,        // ISO string
  lastExportedAt: string | null,
  exportCount: number
}
```

### 3.4 Archived PDF Schema
```javascript
{
  id: string,               // crypto.randomUUID()
  applicationId: string,
  companyName: string,
  jobTitle: string,
  variantId: string,
  revision: number,
  exportedAt: string,
  filename: string,         // "[Full Name] - [Job Title].pdf"
  pdfBlob: Blob             // Exact generated binary Blob
}
```

---

## 4. Reusable DRY Modules & Hooks
- `useDebouncedSave`: Auto-save hook debouncing edits (1000ms), verified with Dexie transaction commit.
- `useListReorder`: Generic hook providing `moveUp`, `moveDown`, `remove`, `duplicate`, `insert` for bullet points, experiences, skills, education, and links.
- `useTheme`: Theme provider managing `light`, `dark`, and `system` preferences with `localStorage` persistence.
- `resumeSchema.js`: Single source of truth for resume factory, validation, link visibility filtering, and normalizer.
- `exportPipeline.js`: PDF Blob generation, filename sanitization, Dexie atomic archive transaction, and download trigger.
