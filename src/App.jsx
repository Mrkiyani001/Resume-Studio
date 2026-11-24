import { AppProviders } from './app/providers.jsx'
import { App } from './app/App.jsx'

export default function Root() {
  return (
    <AppProviders>
      <App />
    </AppProviders>
  )
}
