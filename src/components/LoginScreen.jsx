import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogIn, Search, Users, Settings, ArrowLeft } from 'lucide-react';
import { listDirectoryUsers, describeError } from '../api';
import SettingsModal from './SettingsModal';

export default function LoginScreen({ onLogin, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listDirectoryUsers({ size: 200 });
      const items = Array.isArray(res?.content) ? res.content : [];
      setUsers(items);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        u.userId?.toLowerCase().includes(q)
        || u.displayName?.toLowerCase().includes(q)
        || u.departmentName?.toLowerCase().includes(q)
        || u.positionName?.toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                title="처음으로"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <LogIn className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">결재 데모 로그인</h1>
              <p className="text-sm text-slate-300 mt-1">인사연동 사용자 목록에서 본인을 선택하세요. (인증 절차 없음)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
            title="접속 설정 (JWT, Base URL)"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·아이디·부서·직책 검색"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 break-words">
                {error}
                {String(error).includes('Unauthenticated') && (
                  <div className="text-xs text-red-600 mt-1">
                    JWT 토큰이 없거나 잘못되었습니다. 우측 상단 ⚙️ 에서 토큰을 설정하세요.
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="shrink-0 text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-100 flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                설정
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">사용자 목록을 불러오는 중...</div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5" />
                <span>{filtered.length}명 / 전체 {users.length}명</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {filtered.length === 0 && !loading && (
                  <div className="col-span-full text-center py-10 text-slate-400 text-sm">
                    조건에 맞는 사용자가 없습니다.
                  </div>
                )}
                {filtered.map((user) => (
                  <button
                    key={user.userId}
                    type="button"
                    onClick={() => onLogin(user)}
                    className="text-left p-4 border border-slate-200 rounded-lg hover:border-slate-900 hover:bg-slate-50 transition group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-slate-900">
                          {user.displayName || user.userId}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">{user.userId}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {user.status || 'ACTIVE'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-600 space-x-1">
                      {user.departmentName && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100">{user.departmentName}</span>
                      )}
                      {user.positionName && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100">{user.positionName}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => setReloadKey((v) => v + 1)}
      />
    </div>
  );
}
