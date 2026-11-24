import { User, Plus, Trash2, ArrowUp, ArrowDown, Globe, Link2 } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection.jsx'
import { Input } from '../ui/Input.jsx'
import { Button } from '../ui/Button.jsx'
import { ToggleSwitch } from '../ui/ToggleSwitch.jsx'
import { createLink } from '../../models/resumeSchema.js'
import { useListReorder } from '../../hooks/useListReorder.js'

/**
 * Personal Information Editor Section.
 * Manages full name, headline, phone, email, location, standard links (LinkedIn, Portfolio)
 * and dynamic custom links with visibility toggling and reordering.
 *
 * @param {Object} props
 * @param {Object} props.personalInfo
 * @param {Function} props.onChange (updatedPersonalInfo) => void
 */
export function PersonalInfoSection({ personalInfo, onChange }) {
  const customLinks = personalInfo.customLinks || []

  function handleChange(field, value) {
    onChange({
      ...personalInfo,
      [field]: value,
    })
  }

  function handleLinkChange(linkType, updates) {
    const current = personalInfo[linkType] || createLink({ displayText: linkType === 'linkedin' ? 'LinkedIn' : 'Portfolio' })
    onChange({
      ...personalInfo,
      [linkType]: {
        ...current,
        ...updates,
      },
    })
  }

  const {
    add: addCustomLink,
    update: updateCustomLink,
    remove: removeCustomLink,
    moveUp: moveUpCustomLink,
    moveDown: moveDownCustomLink,
  } = useListReorder(customLinks, (nextLinks) => {
    onChange({
      ...personalInfo,
      customLinks: nextLinks,
    })
  })

  return (
    <CollapsibleSection
      id="section-personal-info"
      title="Personal Information"
      icon={User}
      defaultOpen={true}
    >
      {/* Basic Contact Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          placeholder="e.g. Fahad Ashfaq"
          value={personalInfo.fullName || ''}
          onChange={(e) => handleChange('fullName', e.target.value)}
          required
        />
        <Input
          label="Professional Headline"
          placeholder="e.g. Product UI/UX Designer"
          value={personalInfo.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          helperText="Appears prominently beneath your name on the resume."
        />
        <Input
          label="Email Address"
          type="email"
          placeholder="e.g. alex@example.com"
          value={personalInfo.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
        />
        <Input
          label="Phone Number"
          type="tel"
          placeholder="e.g. +1 (555) 000-0000"
          value={personalInfo.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
        <div className="sm:col-span-2">
          <Input
            label="Location"
            placeholder="e.g. San Francisco, CA (or Remote)"
            value={personalInfo.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </div>
      </div>

      {/* Online Profiles & Links */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Online Profiles & Portfolio Links
        </h4>

        {/* LinkedIn Link Box */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>LinkedIn Profile</span>
            </div>
            <ToggleSwitch
              id="toggle-linkedin-visible"
              label="Show LinkedIn on Resume"
              checked={personalInfo.linkedin?.isVisible !== false}
              onChange={(val) => handleLinkChange('linkedin', { isVisible: val })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Profile URL"
              placeholder="https://linkedin.com/in/username"
              value={personalInfo.linkedin?.url || ''}
              onChange={(e) => handleLinkChange('linkedin', { url: e.target.value })}
            />
            <Input
              label="Display Text"
              placeholder="linkedin.com/in/username"
              value={personalInfo.linkedin?.displayText || ''}
              onChange={(e) => handleLinkChange('linkedin', { displayText: e.target.value })}
            />
          </div>
        </div>

        {/* Portfolio Link Box */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Portfolio / Personal Website</span>
            </div>
            <ToggleSwitch
              id="toggle-portfolio-visible"
              label="Show Portfolio on Resume"
              checked={personalInfo.portfolio?.isVisible !== false}
              onChange={(val) => handleLinkChange('portfolio', { isVisible: val })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Website URL"
              placeholder="https://myportfolio.com"
              value={personalInfo.portfolio?.url || ''}
              onChange={(e) => handleLinkChange('portfolio', { url: e.target.value })}
            />
            <Input
              label="Display Text"
              placeholder="Portfolio"
              value={personalInfo.portfolio?.displayText || ''}
              onChange={(e) => handleLinkChange('portfolio', { displayText: e.target.value })}
            />
          </div>
        </div>

        {/* Custom Links List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Additional Links ({customLinks.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              leftIcon={Plus}
              onClick={() =>
                addCustomLink(createLink({ displayText: 'GitHub', url: '', isVisible: true }))
              }
            >
              Add Custom Link
            </Button>
          </div>

          {customLinks.map((link, idx) => (
            <div
              key={link.id || idx}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <ToggleSwitch
                  id={`toggle-custom-link-${idx}`}
                  label="Show on Resume"
                  checked={link.isVisible !== false}
                  onChange={(val) => updateCustomLink(idx, { isVisible: val })}
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Move link up"
                    disabled={idx === 0}
                    onClick={() => moveUpCustomLink(idx)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Move link down"
                    disabled={idx === customLinks.length - 1}
                    onClick={() => moveDownCustomLink(idx)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 dark:text-red-400"
                    title="Delete link"
                    onClick={() => removeCustomLink(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Link URL"
                  placeholder="https://github.com/username"
                  value={link.url || ''}
                  onChange={(e) => updateCustomLink(idx, { url: e.target.value })}
                />
                <Input
                  label="Display Text"
                  placeholder="e.g. GitHub"
                  value={link.displayText || ''}
                  onChange={(e) => updateCustomLink(idx, { displayText: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  )
}
