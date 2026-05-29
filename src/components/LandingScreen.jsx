import React, { useState } from 'react';
import { ShieldCheck, UserRound, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

// 진입 화면: 관리자 데모 / 사용자 데모 선택.
export default function LandingScreen({ onPick }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">결재 데모</h1>
            <p className="text-sm text-slate-500 mt-1">접속할 데모를 선택하세요.</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-white"
            title="접속 설정 (JWT, Base URL)"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onPick('admin')}
            className="text-left p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-900 text-lg">관리자 데모</div>
            <p className="text-sm text-slate-500 mt-1">
              사용자별로 어떤 결재선을 쓸 수 있는지 할당합니다. (로그인 없음)
            </p>
          </button>

          <button
            type="button"
            onClick={() => onPick('user')}
            className="text-left p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-slate-900 hover:shadow-md transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
              <UserRound className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-900 text-lg">사용자 데모</div>
            <p className="text-sm text-slate-500 mt-1">
              사용자를 선택해 로그인하고 할당된 결재선으로 기안·결재합니다.
            </p>
          </button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
