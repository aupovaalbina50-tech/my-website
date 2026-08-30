import {
  Home,
  BookOpen,
  LayoutGrid,
  ALargeSmall,
  Share2,
  Star,
  Eye,
  FileText,
  Landmark,
  User,
  ClipboardList,
  BarChart3,
  Trophy,
  Settings,
  Siren,
  Quote,
} from 'lucide-react'

export const ACCOUNT_NAV_ITEMS = [
  { key: 'dashboard', to: '/account', end: true, Icon: Home },
  { key: 'terms', to: '/account/terms', Icon: BookOpen },
  { key: 'myDictionary', to: '/account/my-dictionary', Icon: Star },
  { key: 'quotes', to: '/quotes', Icon: Quote },
  { key: 'missions', to: '/account/missions', Icon: Siren },
  { key: 'docs', to: '/account/docs', Icon: FileText },
]

// Not shown in the main sidebar (kept reachable by direct link).
export const SECONDARY_ACCOUNT_NAV_ITEMS = [
  { key: 'profile', to: '/account/profile', Icon: User },
  { key: 'categories', to: '/account/categories', Icon: LayoutGrid },
  { key: 'alphabet', to: '/account/alphabet', Icon: ALargeSmall },
  { key: 'network', to: '/account/network', Icon: Share2 },
  { key: 'favorites', to: '/account/favorites', Icon: Star },
  { key: 'viewingHistory', to: '/account/viewing-history', Icon: Eye },
  { key: 'committees', to: '/account/committees', Icon: Landmark },
  { key: 'tests', to: '/account/tests', Icon: ClipboardList },
  { key: 'statistics', to: '/account/statistics', Icon: BarChart3 },
  { key: 'achievements', to: '/account/achievements', Icon: Trophy },
  { key: 'settings', to: '/account/settings', Icon: Settings },
]
