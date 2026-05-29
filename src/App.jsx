import React, { useEffect, useState } from 'react';
import { LogOut, FileSignature, Inbox, ClipboardCheck, Settings } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import LandingScreen from './components/LandingScreen';
import AdminDemoPage from './components/AdminDemoPage';
import ApplyTab from './components/ApplyTab';
import MyRequestsTab from './components/MyRequestsTab';
import InboxTab from './components/InboxTab';
import SettingsModal from './components/SettingsModal';
import { transitionTypesApi } from './api';
import { TransitionMetaContext, buildTransitionMetaMap } from './utils/transitionRegistry';

const TABS = [
  { key: 'apply', label: '신청', Icon: FileSignature },
  { key: 'requests', label: '신청현황', Icon: Inbox },
  { key: 'inbox', label: '결재함', Icon: ClipboardCheck },
];

export default function App() {
  // 진입 모드: landing(선택) / user(사용자 데모) / admin(관리자 데모)
  const [mode, setMode] = useState('landing');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('apply');
  // 신청·결재 후 다른 탭 데이터 무효화용 토큰
  const [refreshKey, setRefreshKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 백엔드 transition_types 메타맵. 결재함의 처리 버튼을 동적으로 렌더링하는 데 사용.
  const [transitionMetaMap, setTransitionMetaMap] = useState({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await transitionTypesApi.list(user.userId);
        const arr = Array.isArray(list) ? list : Array.isArray(list?.items) ? list.items : [];
        if (!cancelled) setTransitionMetaMap(buildTransitionMetaMap(arr));
      } catch (e) {
        // 실패해도 결재함은 slug 텍스트 폴백으로 동작.
        // eslint-disable-next-line no-console
        console.warn('transition-types 메타 로드 실패:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (mode === 'landing') {
    return <LandingScreen onPick={setMode} />;
  }

  if (mode === 'admin') {
    return <AdminDemoPage onBack={() => setMode('landing')} />;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} onBack={() => setMode('landing')} />;
  }

  const handleCreated = () => {
    setRefreshKey((v) => v + 1);
    setActiveTab('requests');
  };

  const handleActed = () => {
    setRefreshKey((v) => v + 1);
  };

  return (
    <TransitionMetaContext.Provider value={transitionMetaMap}>
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              결
            </div>
            <div>
              <div className="font-bold text-slate-900">결재 데모</div>
              <div className="text-xs text-slate-500">demo_mock</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-900">
                {user.displayName || user.userId}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {user.userId}
                {user.departmentName ? ` · ${user.departmentName}` : ''}
                {user.positionName ? ` · ${user.positionName}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              title="접속 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setUser(null)}
              className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        </div>

        <nav className="max-w-6xl mx-auto px-5 flex gap-1">
          {TABS.map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition ${
                  active
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {activeTab === 'apply' && (
          <ApplyTab user={user} onCreated={handleCreated} onOpenSettings={() => setSettingsOpen(true)} />
        )}
        {activeTab === 'requests' && <MyRequestsTab user={user} refreshKey={refreshKey} />}
        {activeTab === 'inbox' && <InboxTab user={user} refreshKey={refreshKey} onActed={handleActed} />}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => setRefreshKey((v) => v + 1)}
      />
    </div>
    </TransitionMetaContext.Provider>
  );
}
