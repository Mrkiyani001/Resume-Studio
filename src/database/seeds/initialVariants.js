/**
 * Resume Studio — Initial Master Variants Seed
 * Defines the initial 4 editable master variants.
 * Zero shared references; each variant is an independent master record.
 */

import { generateId } from '../../models/resumeSchema.js'

export const INITIAL_VARIANTS = [
  {
    id: 'variant-product-design',
    name: 'Product Design',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    resumeData: {
      personalInfo: {
        fullName: 'Fahad Ashfaq',
        headline: 'Product UI/UX Designer',
        email: 'fahadashfaq.sh@gmail.com',
        phone: '+92 325 8028150',
        location: 'Lahore, Pakistan',
        linkedin: {
          id: generateId(),
          url: 'https://linkedin.com/in/fahadashfaq-ux',
          displayText: 'linkedin.com/in/fahadashfaq-ux',
          isVisible: true,
        },
        portfolio: {
          id: generateId(),
          url: 'https://fahadux.com',
          displayText: 'Portfolio',
          isVisible: true,
        },
        customLinks: [],
      },
      summary: 'Product UI/UX designer specialising in complex systems, multi-role SaaS platforms, and enterprise interfaces. I translate ambiguous requirements and layered workflows into structured, scalable product experiences, prioritising system logic and interaction clarity over surface-level styling. Experienced across the full design lifecycle: from workflow mapping and information architecture to high-fidelity UI and design systems.',
      workExperiences: [
        {
          id: generateId(),
          employer: 'Ghani Branding Agency',
          jobTitle: 'UI/UX Designer & Studio Team Lead',
          startDate: 'Oct 2025',
          endDate: 'Oct 2026',
          location: '',
          bullets: [
            { id: generateId(), text: 'Lead UI/UX design across digital product workstreams. Covering user flows, information architecture, wireframes, and high-fidelity interfaces for web and marketplace platforms.' },
            { id: generateId(), text: 'Define interaction patterns and component standards in Figma, ensuring layout consistency and design system coherence across concurrent product builds.' },
            { id: generateId(), text: 'Collaborate with developers and stakeholders to translate requirements into structured design decisions, bridging the gap between business logic and usable product flows.' },
            { id: generateId(), text: 'Manage a studio team: own design reviews, task distribution, and delivery quality across product and creative workstreams.' },
          ],
        },
        {
          id: generateId(),
          employer: 'AI Orbit',
          jobTitle: 'Product Designer',
          startDate: 'Jul 2024',
          endDate: 'Oct 2025',
          location: '',
          bullets: [
            { id: generateId(), text: 'Designed enterprise platforms across EdTech and SaaS, including AI-powered academic tools, internal knowledge systems, mobile teacher productivity apps, event companion apps, a staff innovation platform, and a multi-campus international competition management system.' },
            { id: generateId(), text: 'Structured complex multi-role workflows — iterative feedback loops, admin approval systems, role-based dashboards — into clear, low-friction product experiences across web and mobile.' },
            { id: generateId(), text: 'Translated Business Requirement Documents into mapped user flows, decision trees, and screen-level designs by aligning system logic with inferred user needs and stakeholder inputs.' },
            { id: generateId(), text: 'Designed and maintained a scalable component system across a product suite serving thousands of users across multiple school campuses.' },
            { id: generateId(), text: 'Built interactive Figma prototypes for stakeholder validation and developer handoff, reducing misalignment and revision cycles at the implementation stage.' },
            { id: generateId(), text: 'Applied iterative stakeholder feedback to refine information hierarchy, navigation structure, and interaction patterns across the product suite.' },
          ],
        },
        {
          id: generateId(),
          employer: 'Graphic View',
          jobTitle: 'Graphic Designer',
          startDate: 'Aug 2023',
          endDate: 'Jul 2024',
          location: '',
          bullets: [
            { id: generateId(), text: 'Developed foundational skills in visual hierarchy, typography, and layout systems — disciplines that directly inform structured UI design and component-level thinking.' },
          ],
        },
      ],
      skills: [
        {
          id: generateId(),
          categoryName: 'Product & UX',
          skills: [
            { id: generateId(), name: 'Information Architecture' },
            { id: generateId(), name: 'Interaction Design' },
            { id: generateId(), name: 'User Flows' },
            { id: generateId(), name: 'Workflow Mapping' },
            { id: generateId(), name: 'Usability Review' },
            { id: generateId(), name: 'Prototyping' },
          ],
        },
        {
          id: generateId(),
          categoryName: 'UI & Systems',
          skills: [
            { id: generateId(), name: 'Design Systems' },
            { id: generateId(), name: 'Auto-Layout' },
            { id: generateId(), name: 'High-Fidelity UI' },
            { id: generateId(), name: 'Responsive Design' },
            { id: generateId(), name: 'Dashboard Design' },
            { id: generateId(), name: 'Enterprise Interface Design' },
          ],
        },
        {
          id: generateId(),
          categoryName: 'Platforms',
          skills: [
            { id: generateId(), name: 'SaaS Products' },
            { id: generateId(), name: 'Internal Tools' },
            { id: generateId(), name: 'Multi-Role Platforms' },
            { id: generateId(), name: 'Mobile Applications' },
            { id: generateId(), name: 'Web Platforms' },
          ],
        },
        {
          id: generateId(),
          categoryName: 'Tools',
          skills: [
            { id: generateId(), name: 'Figma' },
            { id: generateId(), name: 'Framer' },
          ],
        },
      ],
      education: [
        {
          id: generateId(),
          institution: 'Virtual University of Pakistan',
          degree: 'Bachelor of Science — Computer Science',
          startDate: '2022',
          endDate: '2026',
          description: '',
        },
      ],
      additionalSections: [],
    },
  },
  {
    id: 'variant-it-software-operations',
    name: 'IT & Software Operations',
    createdAt: '2026-01-01T00:00:01.000Z',
    updatedAt: '2026-01-01T00:00:01.000Z',
    resumeData: {
      personalInfo: {
        fullName: 'Fahad Ashfaq',
        headline: 'IT & Software Operations Specialist',
        email: 'fahadashfaq.sh@gmail.com',
        phone: '+92 325 8028150',
        location: 'Lahore, Pakistan',
        linkedin: {
          id: generateId(),
          url: 'https://linkedin.com/in/fahadashfaq-ux',
          displayText: 'linkedin.com/in/fahadashfaq-ux',
          isVisible: true,
        },
        portfolio: {
          id: generateId(),
          url: '',
          displayText: 'Portfolio',
          isVisible: false,
        },
        customLinks: [],
      },
      summary: 'Hands-on IT Operations Specialist with practical experience maintaining reliable software infrastructure, streamlining internal workflows, and resolving system bottlenecks across multi-team production environments. Focused on uptime, standardized tooling, and proactive support.',
      workExperiences: [
        {
          id: generateId(),
          employer: 'Enterprise Tech Solutions',
          jobTitle: 'IT Operations Lead',
          startDate: '2024',
          endDate: 'Present',
          location: 'Lahore, Pakistan',
          bullets: [
            { id: generateId(), text: 'Oversee internal workplace technology, cloud service accounts, and developer tooling across distributed engineering teams.' },
            { id: generateId(), text: 'Standardized issue triage and incident management workflows, reducing resolution time for critical system blockers by 35%.' },
            { id: generateId(), text: 'Audited team hardware and access permissions, ensuring continuous compliance with security and privacy requirements.' },
          ],
        },
      ],
      skills: [
        {
          id: generateId(),
          categoryName: 'Core Operations',
          skills: [
            { id: generateId(), name: 'System Administration' },
            { id: generateId(), name: 'Incident Response' },
            { id: generateId(), name: 'Access Management' },
            { id: generateId(), name: 'Software Rollouts' },
          ],
        },
        {
          id: generateId(),
          categoryName: 'Tools & Platforms',
          skills: [
            { id: generateId(), name: 'Linux / Windows Server' },
            { id: generateId(), name: 'Docker' },
            { id: generateId(), name: 'Git' },
            { id: generateId(), name: 'Jira' },
          ],
        },
      ],
      education: [
        {
          id: generateId(),
          institution: 'Virtual University of Pakistan',
          degree: 'Bachelor of Science — Computer Science',
          startDate: '2022',
          endDate: '2026',
          description: '',
        },
      ],
      additionalSections: [],
    },
  },
  {
    id: 'variant-business-admin-operations',
    name: 'Business & Administrative Operations',
    createdAt: '2026-01-01T00:00:02.000Z',
    updatedAt: '2026-01-01T00:00:02.000Z',
    resumeData: {
      personalInfo: {
        fullName: 'Fahad Ashfaq',
        headline: 'Business & Administrative Operations Manager',
        email: 'fahadashfaq.sh@gmail.com',
        phone: '+92 325 8028150',
        location: 'Lahore, Pakistan',
        linkedin: {
          id: generateId(),
          url: 'https://linkedin.com/in/fahadashfaq-ux',
          displayText: 'linkedin.com/in/fahadashfaq-ux',
          isVisible: true,
        },
        portfolio: {
          id: generateId(),
          url: '',
          displayText: 'Portfolio',
          isVisible: false,
        },
        customLinks: [],
      },
      summary: 'Administrative and operational coordinator experienced in driving cross-departmental alignment, vendor management, executive reporting, and process documentation across scaling organizations.',
      workExperiences: [
        {
          id: generateId(),
          employer: 'Global Operations Group',
          jobTitle: 'Administrative Operations Lead',
          startDate: '2024',
          endDate: 'Present',
          location: 'Lahore, Pakistan',
          bullets: [
            { id: generateId(), text: 'Coordinated operational deliverables across 4 business departments, ensuring project milestones aligned with budgetary limits.' },
            { id: generateId(), text: 'Authored Standard Operating Procedures (SOPs) for team onboarding, procurement, and vendor contract tracking.' },
            { id: generateId(), text: 'Facilitated executive reporting and cross-functional meetings to clear cross-team administrative blockers.' },
          ],
        },
      ],
      skills: [
        {
          id: generateId(),
          categoryName: 'Business Execution',
          skills: [
            { id: generateId(), name: 'Process Optimization' },
            { id: generateId(), name: 'Vendor Coordination' },
            { id: generateId(), name: 'Budget Tracking' },
            { id: generateId(), name: 'Cross-functional Communication' },
          ],
        },
      ],
      education: [
        {
          id: generateId(),
          institution: 'Virtual University of Pakistan',
          degree: 'Bachelor of Science — Computer Science',
          startDate: '2022',
          endDate: '2026',
          description: '',
        },
      ],
      additionalSections: [],
    },
  },
  {
    id: 'variant-data-digital-operations',
    name: 'Data & Digital Operations',
    createdAt: '2026-01-01T00:00:03.000Z',
    updatedAt: '2026-01-01T00:00:03.000Z',
    resumeData: {
      personalInfo: {
        fullName: 'Fahad Ashfaq',
        headline: 'Data & Digital Operations Specialist',
        email: 'fahadashfaq.sh@gmail.com',
        phone: '+92 325 8028150',
        location: 'Lahore, Pakistan',
        linkedin: {
          id: generateId(),
          url: 'https://linkedin.com/in/fahadashfaq-ux',
          displayText: 'linkedin.com/in/fahadashfaq-ux',
          isVisible: true,
        },
        portfolio: {
          id: generateId(),
          url: '',
          displayText: 'Portfolio',
          isVisible: false,
        },
        customLinks: [],
      },
      summary: 'Data operations specialist focusing on structured data pipelines, operational analytics dashboards, and digital workflow automation to enable informed business decisions.',
      workExperiences: [
        {
          id: generateId(),
          employer: 'Digital Insights Lab',
          jobTitle: 'Data Operations Specialist',
          startDate: '2024',
          endDate: 'Present',
          location: 'Lahore, Pakistan',
          bullets: [
            { id: generateId(), text: 'Built structured data validation pipelines and reporting spreadsheets to monitor key business metrics.' },
            { id: generateId(), text: 'Collaborated with operations teams to migrate manual spreadsheets into centralized interactive dashboards.' },
            { id: generateId(), text: 'Maintained data hygiene, automated daily pipeline checks, and documented ETL definitions.' },
          ],
        },
      ],
      skills: [
        {
          id: generateId(),
          categoryName: 'Data & Analytics',
          skills: [
            { id: generateId(), name: 'Data Pipeline Design' },
            { id: generateId(), name: 'Reporting & Dashboards' },
            { id: generateId(), name: 'SQL & Querying' },
            { id: generateId(), name: 'Data Quality Audits' },
          ],
        },
      ],
      education: [
        {
          id: generateId(),
          institution: 'Virtual University of Pakistan',
          degree: 'Bachelor of Science — Computer Science',
          startDate: '2022',
          endDate: '2026',
          description: '',
        },
      ],
      additionalSections: [],
    },
  },
]
