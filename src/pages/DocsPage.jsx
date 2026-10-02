import SiteSectionLayout from '../components/SiteSectionLayout.jsx'
import DocsContent from './shared/DocsContent.jsx'

function DocsPage() {
  return (
    <SiteSectionLayout activeSection="docs">
      <DocsContent />
    </SiteSectionLayout>
  )
}

export default DocsPage
