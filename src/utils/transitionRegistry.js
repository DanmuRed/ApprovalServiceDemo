// 처리조건(transition) 메타 레지스트리.
// 백엔드 transition_types 테이블의 iconName/colorTheme 값을
// lucide-react 아이콘 컴포넌트와 Tailwind 클래스로 매핑한다.
// (client_mock/src/utils/transitionRegistry.js 와 동일한 자산 — 변경 시 함께 동기화 필요)
import React from 'react';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  Shield,
  Star,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Eye,
  MessageCircle,
  ArrowRightCircle,
  PauseCircle,
  Send,
} from 'lucide-react';

export const ICON_REGISTRY = {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  Shield,
  Star,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Eye,
  MessageCircle,
  ArrowRightCircle,
  PauseCircle,
  Send,
};

export const COLOR_THEME_MAP = {
  emerald: {
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    buttonClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  red: {
    colorClass: 'text-red-500',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    buttonClass: 'bg-red-600 text-white hover:bg-red-700',
  },
  orange: {
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
    buttonClass: 'bg-orange-500 text-white hover:bg-orange-600',
  },
  blue: {
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    buttonClass: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  violet: {
    colorClass: 'text-violet-500',
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-200',
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
    buttonClass: 'bg-violet-600 text-white hover:bg-violet-700',
  },
  amber: {
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    buttonClass: 'bg-amber-500 text-white hover:bg-amber-600',
  },
  rose: {
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    buttonClass: 'bg-rose-600 text-white hover:bg-rose-700',
  },
  teal: {
    colorClass: 'text-teal-500',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-700 border-teal-200',
    buttonClass: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  slate: {
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    buttonClass: 'bg-slate-600 text-white hover:bg-slate-700',
  },
  gray: {
    colorClass: 'text-gray-500',
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
    buttonClass: 'bg-gray-600 text-white hover:bg-gray-700',
  },
};

const DEFAULT_THEME = COLOR_THEME_MAP.gray;
const DEFAULT_ICON = CheckCircle;

export function resolveTransitionMeta(tt) {
  const theme = COLOR_THEME_MAP[tt?.colorTheme] || DEFAULT_THEME;
  const icon = ICON_REGISTRY[tt?.iconName] || DEFAULT_ICON;
  return {
    icon,
    label: tt?.name || tt?.slug || '',
    ...theme,
  };
}

export function buildTransitionMetaMap(transitionTypeList) {
  const map = {};
  if (!Array.isArray(transitionTypeList)) return map;
  for (const tt of transitionTypeList) {
    if (tt?.slug) {
      map[tt.slug] = resolveTransitionMeta(tt);
    }
  }
  return map;
}

export const TransitionMetaContext = React.createContext({});
