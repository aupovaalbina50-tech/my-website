import { memo } from 'react'
import { ArrowRight } from 'lucide-react'
import { CATEGORIES } from '../../i18n/translations'
import { categoryLucideIcon } from '../../constants/categoryIcons.js'

const CategoryGrid = memo(function CategoryGrid({ t, lang, counts, countsReady, onSelect }) {
  return (
    <section className="category-section">
      <h2 className="category-section-title">{t.categorySection.title}</h2>
      <div className="category-grid">
        {CATEGORIES.map((cat, index) => {
          const Icon = categoryLucideIcon(cat.key)
          const count = counts[cat.key] || 0
          return (
            <button
              key={cat.key}
              type="button"
              className="category-card"
              onClick={() => onSelect(cat.key)}
            >
              <span className="category-card-top">
                <Icon className="category-card-icon" strokeWidth={1.75} aria-hidden="true" />
                <span className="category-card-number">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <span className="category-card-name">{cat[lang]}</span>
              <span className="category-card-bottom">
                {countsReady && <span className="category-card-count">{t.categorySection.count(count)}</span>}
                <ArrowRight className="category-card-arrow" strokeWidth={2} aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
})

export default CategoryGrid
