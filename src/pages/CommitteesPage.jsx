import SiteSectionLayout from '../components/SiteSectionLayout.jsx'
import CommitteesContent from './shared/CommitteesContent.jsx'

function CommitteesPage() {
  return (
    <SiteSectionLayout activeSection="committees">
      <CommitteesContent />
    </SiteSectionLayout>
  )
}

export default CommitteesPage
