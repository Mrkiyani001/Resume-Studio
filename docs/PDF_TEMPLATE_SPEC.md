# Resume Studio — PDF Template Specification (Reference Document Measurements)

Authoritative reference source: `reference/Fahad Ashfaq - Product UX Designer 2026 .docx`
Extracted via direct OpenXML (`word/document.xml`, `word/styles.xml`, `word/numbering.xml`, `word/theme/theme1.xml`) inspection.

---

## 1. Page Geometry & Layout

- **Page Format:** A4 Portrait
  - OpenXML measurement: `w:w="11906"` twips $\times$ `w:h="16838"` twips
  - Equivalent points: **595.3 pt $\times$ 841.9 pt** (standard ISO A4)
  - Equivalent millimeters: **210 mm $\times$ 297 mm**
- **Page Margins:** Uniform 0.5 inches (36 pt / 12.7 mm)
  - `w:top="720"` twips = **36 pt**
  - `w:bottom="720"` twips = **36 pt**
  - `w:left="720"` twips = **36 pt**
  - `w:right="720"` twips = **36 pt**
- **Layout Structure:** Strictly single-column, top-to-bottom vertical rhythm. Zero sidebars, zero multi-column layouts, zero photos, zero icons.

---

## 2. Typography & Fonts

All text runs in the reference document specify font family **Arial** (`w:rFonts w:ascii="Arial"`).
Bundled offline in `public/fonts/`:
- `public/fonts/arial.ttf` (Regular, 400)
- `public/fonts/arialbd.ttf` (Bold, 700)
- `public/fonts/ariali.ttf` (Italic, 400)
- `public/fonts/arialbi.ttf` (Bold Italic, 700)

### Element Hierarchy & Typography Scale

| Element | Font Weight / Style | Size (pt) | Size (`w:sz` half-pts) | Color Hex | Spacing Before / After | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Full Name** | Arial Bold (700) | **24 pt** | `w:sz="48"` | `#1a1a2e` | before: 0pt, after: 3pt | Uppercase with expanded tracking |
| **Headline** | Arial Regular (400) | **11 pt** | `w:sz="22"` | `#555555` | before: 0pt, after: 4pt | Directly below Full Name |
| **Contact Row** | Arial Regular (400) | **9.5 pt** | `w:sz="19"` | `#555555` / `#1a56db` | before: 0pt, after: 4pt | Phone, Location, clickable links (blue + underlined) |
| **Section Headings** | Arial Bold (700) | **10 pt** | `w:sz="20"` | `#1a1a2e` | before: 11pt, after: 3pt | Uppercase with expanded tracking (`S U M M A R Y`, etc.) |
| **Section Dividers** | Solid Border | **1.0 pt** thick | `w:sz="8"` (eighth-pts) | `#2c2c54` | before: 0pt, after: 4pt | Thin horizontal line beneath section heading |
| **Role & Employer** | Arial Bold (700) | **11 pt** | `w:sz="22"` | `#222222` | before: 8pt, after: 1.5pt | Formatted as `Job Title  \|  Employer` |
| **Experience Dates** | Arial Italic (400) | **10 pt** | `w:sz="20"` | `#555555` | align: right | Formatted as `Start Date – End Date` |
| **Bullet Points** | Arial Regular (400) | **10 pt** | `w:sz="20"` | `#222222` | before: 2pt, after: 2pt | Hanging indent: 12pt, left margin: 18pt |
| **Bullet Symbol** | Arial Regular | **10 pt** | `–` (En-dash) | `#555555` | – | Character `\u2013` |
| **Executive Summary** | Arial Regular (400) | **10 pt** | `w:sz="20"` | `#222222` | before: 3pt, after: 4pt | Line-height: ~1.25 |
| **Skill Category Label** | Arial Bold (700) | **10 pt** | `w:sz="20"` | `#1a1a2e` | inline | Formatted as `Category Name: ` |
| **Skills List** | Arial Regular (400) | **10 pt** | `w:sz="20"` | `#222222` | inline | Separated by ` · ` (`\u00b7`) |
| **Education Entry** | Arial Bold (700) | **11 pt** | `w:sz="22"` | `#222222` | before: 8pt, after: 1.5pt | Formatted as `Degree  \|  Institution` with right-aligned dates |

---

## 3. Exact Color Palette

- **Primary Dark Navy (Headings, Name):** `#1a1a2e`
- **Section Divider Line (Navy):** `#2c2c54`
- **Primary Body Text (Roles, Bullets, Summary):** `#222222`
- **Muted Secondary Text (Headline, Dates, Bullets):** `#555555`
- **Hyperlink Blue (Contact Links):** `#1a56db`
- **Page Background:** `#ffffff` (Pure White)

---

## 4. Spacing, Line Heights & Dividers

- **Horizontal Dividers:**
  - Border width: `1.0 pt` (OpenXML `w:sz="8"` eighths of a pt)
  - Color: `#2c2c54`
  - Position: Horizontal divider separating header from summary, summary from experience, experience from skills, skills from education.
- **Bullet List Indentation:**
  - `w:ind w:left="360" w:hanging="240"` twips
  - Left margin: **18 pt**
  - Hanging offset: **12 pt**
  - Bullet character: En-dash (`–`, `#555555`)
- **Pagination Strategy:**
  - A4 single page when content fits naturally; clean multi-page pagination for longer resumes.
  - Section headings wrapped with content; experience title/company kept together with at least the first bullet point via `wrap={false}` to avoid orphan headers.
