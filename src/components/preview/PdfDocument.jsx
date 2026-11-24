import { Font, Document, Page, Text, View, Link, StyleSheet } from '@react-pdf/renderer'

// Safe offline font registration
const isVitest =
  typeof globalThis !== 'undefined' && Boolean(globalThis.process?.env?.VITEST)
const fontBase =
  isVitest && globalThis.process?.cwd
    ? `${globalThis.process.cwd().replace(/\\/g, '/')}/public/fonts`
    : '/fonts'

try {
  Font.register({
    family: 'Arial',
    fonts: [
      { src: `${fontBase}/arial.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
      { src: `${fontBase}/arialbd.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
      { src: `${fontBase}/ariali.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
      { src: `${fontBase}/arialbi.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
    ],
  })
} catch {
  // Ignore if already registered
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Arial',
    fontSize: 10,
    backgroundColor: '#ffffff',
    color: '#222222',
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 36,
    paddingRight: 36,
  },
  // Header Section
  headerContainer: {
    marginBottom: 6,
  },
  fullName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 1.5,
    marginBottom: 3,
  },
  headline: {
    fontSize: 11,
    color: '#555555',
    lineHeight: 1.2,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    fontSize: 9.5,
    color: '#555555',
    marginBottom: 4,
  },
  contactItem: {
    color: '#555555',
  },
  contactLink: {
    color: '#1a56db',
    textDecoration: 'underline',
  },
  contactSeparator: {
    marginHorizontal: 4,
    color: '#888888',
  },
  // Section Headings & Dividers
  sectionContainer: {
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#2c2c54',
    marginBottom: 6,
  },
  // Summary
  summaryText: {
    fontSize: 10,
    color: '#222222',
    lineHeight: 1.3,
    marginBottom: 4,
  },
  // Work Experience
  experienceEntry: {
    marginBottom: 6,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  roleAndEmployer: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#222222',
    flex: 1,
  },
  dateRange: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#555555',
    textAlign: 'right',
    marginLeft: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 1.5,
    marginBottom: 1.5,
    paddingLeft: 6,
  },
  bulletSymbol: {
    width: 12,
    fontSize: 10,
    color: '#555555',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: '#222222',
    lineHeight: 1.25,
  },
  // Skills
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  skillCategoryName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  skillListText: {
    fontSize: 10,
    color: '#222222',
    flex: 1,
  },
  // Education
  educationEntry: {
    marginBottom: 4,
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 1,
  },
  degreeAndSchool: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#222222',
    flex: 1,
  },
  educationDate: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#555555',
    textAlign: 'right',
    marginLeft: 8,
  },
  educationDescription: {
    fontSize: 9.5,
    color: '#555555',
    marginTop: 1,
  },
  // Additional Sections
  customItem: {
    marginBottom: 4,
  },
  customItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  customItemTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#222222',
  },
  customItemSubtitle: {
    fontSize: 9.5,
    color: '#555555',
  },
  customItemDate: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#555555',
  },
  customItemText: {
    fontSize: 10,
    color: '#222222',
    marginTop: 1,
  },
})

/**
 * Letter-spaces uppercase text for visual fidelity with the reference document.
 * @param {string} text
 * @returns {string}
 */
function formatLetterSpaced(text) {
  if (!text || typeof text !== 'string') return ''
  return text.trim().toUpperCase()
}

/**
 * Pure Decoupled PDF Document Component.
 * Consumes resumeData ONLY (strictly zero coupling with editor UI state).
 *
 * @param {Object} props
 * @param {Object} props.resumeData Normalized resume data object
 */
export function PdfDocument({ resumeData }) {
  if (!resumeData) return null

  const {
    personalInfo = {},
    summary = '',
    workExperiences = [],
    skills = [],
    education = [],
    additionalSections = [],
  } = resumeData

  // 1. Build Contact Items (Filtering out hidden links)
  const contactElements = []

  if (personalInfo.phone) {
    contactElements.push({ type: 'text', content: personalInfo.phone })
  }
  if (personalInfo.email) {
    contactElements.push({
      type: 'link',
      url: `mailto:${personalInfo.email}`,
      text: personalInfo.email,
    })
  }
  if (personalInfo.location) {
    contactElements.push({ type: 'text', content: personalInfo.location })
  }
  if (personalInfo.linkedin && personalInfo.linkedin.isVisible !== false && personalInfo.linkedin.url) {
    contactElements.push({
      type: 'link',
      url: personalInfo.linkedin.url,
      text: personalInfo.linkedin.displayText || 'LinkedIn',
    })
  }
  if (personalInfo.portfolio && personalInfo.portfolio.isVisible !== false && personalInfo.portfolio.url) {
    contactElements.push({
      type: 'link',
      url: personalInfo.portfolio.url,
      text: personalInfo.portfolio.displayText || 'Portfolio',
    })
  }
  ;(personalInfo.customLinks || []).forEach((link) => {
    if (link.isVisible !== false && (link.url || link.displayText)) {
      contactElements.push({
        type: 'link',
        url: link.url,
        text: link.displayText || link.url,
      })
    }
  })

  // 2. Filter visible additional sections
  const visibleCustomSections = (additionalSections || []).filter(
    (sec) => sec.isVisible !== false && Array.isArray(sec.items) && sec.items.length > 0
  )

  // 3. Filter valid education entries
  const validEducation = (education || []).filter(
    (e) => e.degree || e.institution || e.description
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER: Full Name, Headline, Contact Row */}
        <View style={styles.headerContainer}>
          <Text style={styles.fullName}>
            {formatLetterSpaced(personalInfo.fullName || 'Candidate Name')}
          </Text>

          {personalInfo.headline ? (
            <Text style={styles.headline}>{personalInfo.headline}</Text>
          ) : null}

          {contactElements.length > 0 && (
            <View style={styles.contactRow}>
              {contactElements.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.type === 'link' ? (
                    <Link src={item.url} style={styles.contactLink}>
                      {item.text}
                    </Link>
                  ) : (
                    <Text style={styles.contactItem}>{item.content}</Text>
                  )}
                  {idx < contactElements.length - 1 && (
                    <Text style={styles.contactSeparator}> · </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 1. PROFESSIONAL SUMMARY */}
        {summary ? (
          <View wrap={false} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>S U M M A R Y</Text>
            <View style={styles.divider} />
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* 2. WORK EXPERIENCE */}
        {workExperiences.length > 0 && (
          <View style={styles.sectionContainer}>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>W O R K  E X P E R I E N C E</Text>
              <View style={styles.divider} />
            </View>

            {workExperiences.map((exp) => {
              const bullets = (exp.bullets || []).filter((b) => b && b.text && b.text.trim())
              const employerText = exp.employer ? `  |  ${exp.employer}` : ''
              const titleAndEmployer = `${exp.jobTitle || 'Role'}${employerText}`
              const dateText = [exp.startDate, exp.endDate].filter(Boolean).join(' – ')

              return (
                <View key={exp.id} style={styles.experienceEntry}>
                  {/* Keep role header together with first bullet to prevent orphan headers */}
                  <View wrap={false}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.roleAndEmployer}>{titleAndEmployer}</Text>
                      {dateText ? <Text style={styles.dateRange}>{dateText}</Text> : null}
                    </View>

                    {bullets.length > 0 && (
                      <View style={styles.bulletRow}>
                        <Text style={styles.bulletSymbol}>–</Text>
                        <Text style={styles.bulletText}>{bullets[0].text}</Text>
                      </View>
                    )}
                  </View>

                  {/* Remaining bullets paginate naturally without breaking across lines */}
                  {bullets.slice(1).map((b) => (
                    <View key={b.id} wrap={false} style={styles.bulletRow}>
                      <Text style={styles.bulletSymbol}>–</Text>
                      <Text style={styles.bulletText}>{b.text}</Text>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        )}

        {/* 3. SKILLS */}
        {skills.length > 0 && (
          <View style={styles.sectionContainer}>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>S K I L L S</Text>
              <View style={styles.divider} />
            </View>

            {skills.map((category) => {
              const skillNames = (category.skills || []).map((s) => s.name).filter(Boolean)
              if (skillNames.length === 0 && !category.categoryName) return null

              return (
                <View key={category.id} wrap={false} style={styles.skillsRow}>
                  <Text>
                    <Text style={styles.skillCategoryName}>
                      {category.categoryName ? `${category.categoryName}:  ` : ''}
                    </Text>
                    <Text style={styles.skillListText}>
                      {skillNames.join(' · ')}
                    </Text>
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* 4. EDUCATION */}
        {validEducation.length > 0 && (
          <View style={styles.sectionContainer}>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>E D U C A T I O N</Text>
              <View style={styles.divider} />
            </View>

            {validEducation.map((edu) => {
              const schoolText = edu.institution ? `  |  ${edu.institution}` : ''
              const degreeAndSchool = `${edu.degree || 'Degree'}${schoolText}`
              const dateText = [edu.startDate, edu.endDate].filter(Boolean).join(' – ')

              return (
                <View key={edu.id} wrap={false} style={styles.educationEntry}>
                  <View style={styles.educationHeader}>
                    <Text style={styles.degreeAndSchool}>{degreeAndSchool}</Text>
                    {dateText ? <Text style={styles.educationDate}>{dateText}</Text> : null}
                  </View>
                  {edu.description ? (
                    <Text style={styles.educationDescription}>{edu.description}</Text>
                  ) : null}
                </View>
              )
            })}
          </View>
        )}

        {/* 5. ADDITIONAL / CUSTOM SECTIONS */}
        {visibleCustomSections.map((sec) => (
          <View key={sec.id} style={styles.sectionContainer}>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>{formatLetterSpaced(sec.title)}</Text>
              <View style={styles.divider} />
            </View>

            {sec.items.map((item) => (
              <View key={item.id} wrap={false} style={styles.customItem}>
                <View style={styles.customItemHeader}>
                  <Text style={styles.customItemTitle}>{item.title}</Text>
                  {item.date ? <Text style={styles.customItemDate}>{item.date}</Text> : null}
                </View>
                {item.subtitle ? (
                  <Text style={styles.customItemSubtitle}>{item.subtitle}</Text>
                ) : null}
                {item.text ? <Text style={styles.customItemText}>{item.text}</Text> : null}
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  )
}
