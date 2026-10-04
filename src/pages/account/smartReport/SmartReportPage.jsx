import './smartReport.css'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePenLine, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { useWorkReports } from './useWorkReports.js'
import { templateFor } from './templates/index.js'

// «Рапортты құрастыру / Составление рапорта» — start page in the personal
// account: create a report and «Мои рапорты» (drafts / finished / recent).
// Creating documents only; checking a finished document is the separate
// «Құжат мазмұнын сараптау» tool.

const TABS = ['drafts', 'final', 'recent']
const RECENT_LIMIT = 10

function SmartReportPage() {
  const { lang, t } = useLanguage()
  const tr = t.smartReport
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { reports, loading, error, remove } = useWorkReports()
  const [tab, setTab] = useState('drafts')

  const visible = useMemo(() => {
    if (tab === 'drafts') return reports.filter((r) => r.status === 'draft')
    if (tab === 'final') return reports.filter((r) => r.status === 'final')
    return reports.slice(0, RECENT_LIMIT)
  }, [reports, tab])

  const counts = {
    drafts: reports.filter((r) => r.status === 'draft').length,
    final: reports.filter((r) => r.status === 'final').length,
    recent: Math.min(reports.length, RECENT_LIMIT),
  }

  const formatDate = (value) => new Date(value).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

  const handleDelete = async (report) => {
    if (!window.confirm(tr.confirmDelete(report.title || tr.untitled))) return
    const ok = await remove(report.id)
    showToast(ok ? tr.deleted : tr.deleteFailed, { type: ok ? 'success' : 'error' })
  }

  return (
    <div className="report-page">
      <header className="report-hero">
        <span className="report-hero-icon" aria-hidden="true">
          <FilePenLine size={30} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="report-hero-title">{tr.title}</h1>
          <p className="report-hero-lead">{tr.lead}</p>
        </div>
        <button type="button" className="report-btn report-btn--primary report-hero-create" onClick={() => navigate('/account/smart-report/new')}>
          <Plus size={18} aria-hidden="true" />
          {tr.create}
        </button>
      </header>

      <section className="report-list-card">
        <h2 className="report-section-title">{tr.myReports}</h2>
        <div className="report-tabs" role="tablist">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`report-tab${tab === key ? ' report-tab--active' : ''}`}
              onClick={() => setTab(key)}
            >
              {tr.tabs[key]}
              <span className="report-tab-count">{counts[key]}</span>
            </button>
          ))}
        </div>

        {loading && <p className="report-muted">…</p>}
        {!loading && error && <p className="report-error">{tr.loadFailed}</p>}
        {!loading && !error && visible.length === 0 && <p className="report-muted">{tr.empty[tab]}</p>}

        <ul className="report-list">
          {visible.map((report) => (
            <li key={report.id} className="report-list-item">
              <Link to={`/account/smart-report/${report.id}`} className="report-list-main">
                <span className="report-list-title">{report.title || tr.untitled}</span>
                <span className="report-list-meta">
                  <span className={`report-status report-status--${report.status}`}>
                    {report.status === 'final' ? tr.statusFinal : tr.statusDraft}
                  </span>
                  <span>{templateFor(report.report_type).name[lang]}</span>
                  {report.status === 'draft' && <span>{tr.stepShort(report.step)}</span>}
                  {report.current_version > 0 && <span>{tr.versionShort(report.current_version)}</span>}
                  <span>{tr.updatedAt(formatDate(report.updated_at))}</span>
                </span>
              </Link>
              {report.status === 'draft' && (
                <button type="button" className="report-icon-btn" onClick={() => handleDelete(report)} aria-label={tr.delete} title={tr.delete}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default SmartReportPage
