import {
  Home,
  User,
  Star,
  BookMarked,
  Eye,
  ClipboardList,
  BarChart3,
  Trophy,
  Settings,
} from 'lucide-react'

export const ACCOUNT_NAV_ITEMS = [
  { key: 'dashboard', to: '/account', end: true, Icon: Home },
  { key: 'profile', to: '/account/profile', Icon: User },
  { key: 'myDictionary', to: '/account/my-dictionary', Icon: BookMarked },
  { key: 'favorites', to: '/account/favorites', Icon: Star },
  { key: 'viewingHistory', to: '/account/viewing-history', Icon: Eye },
  { key: 'tests', to: '/account/tests', Icon: ClipboardList },
  { key: 'statistics', to: '/account/statistics', Icon: BarChart3 },
  { key: 'achievements', to: '/account/achievements', Icon: Trophy },
  { key: 'settings', to: '/account/settings', Icon: Settings },
]
