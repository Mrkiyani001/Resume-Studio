import { FolderGit2, Briefcase, PlusCircle, Settings } from 'lucide-react'

export const NAVIGATION_DESTINATIONS = [
  {
    id: 'my-resumes',
    label: 'My Resumes',
    icon: FolderGit2,
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: Briefcase,
  },
  {
    id: 'new-application',
    label: 'New App',
    icon: PlusCircle,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
]
