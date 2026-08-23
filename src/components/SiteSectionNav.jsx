import { memo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, List, Quote, Landmark, Users, FileText, ArrowLeftRight } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { SECTION_IDS, ROUTE_SECTIONS } from '../constants/navigation.js'

const SECTION_ICONS = {
  search: Search,
  terms: List,
  confusable: ArrowLeftRight,
  quotes: Quote,
  ministry: Landmark,
  committees: Users,
  docs: FileText,
}

function SiteSectionNav({ activeSection, onSectionClick, onNavigate }) {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  const handleClick = (id) => {
    if (location.pathname === '/' && onSectionClick) {
      onSectionClick(id)
    } else {
      navigate(`/#${id}`)
    }
    onNavigate?.()
  }

  return SECTION_IDS.map((id) => {
    const Icon = SECTION_ICONS[id]
    const routePath = ROUTE_SECTIONS[id]

    if (routePath) {
      const isActive =
        location.pathname === routePath || location.pathname.startsWith(`${routePath}/`)
      return (
        <Link
          key={id}
          to={routePath}
          className={`sidebar-link${isActive ? ' active' : ''}`}
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon size={18} className="sidebar-link-icon" aria-hidden="true" />
          <span>{t.nav[id]}</span>
        </Link>
      )
    }

    return (
      <button
        key={id}
        type="button"
        className={`sidebar-link${id === 'search' ? ' sidebar-link-search' : ''}${activeSection === id ? ' active' : ''}`}
        onClick={() => handleClick(id)}
        aria-current={activeSection === id ? 'page' : undefined}
      >
        <Icon size={18} className="sidebar-link-icon" aria-hidden="true" />
        <span>{t.nav[id]}</span>
      </button>
    )
  })
}

export default memo(SiteSectionNav)
