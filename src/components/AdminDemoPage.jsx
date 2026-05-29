import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Users, RefreshCw, Settings, ShieldCheck, CheckCheck, Eraser } from 'lucide-react';
import { listDirectoryUsers, playbooksApi, describeError } from '../api';
import { getFeBase } from '../runtimeSettings';
import {
  getAssignedPlaybookIds,
  getAllAssignments,
  toggleAssignment,
  setUserAssignments,
  setUsersAssignments,
  clearAllAssignments,
} from '../lineAssignments';
import SettingsModal from './SettingsModal';
import PlaybookPreviewModal from './PlaybookPreviewModal';
import PlaybookManagePanel from './PlaybookManagePanel';

// 관리자 데모: 로그인 없이 사용자별로 어떤 결재선을 허용할지 할당한다.
// 할당은 localStorage 에 저장되어 사용자 데모 화면(ApplyTab)의 결재선 목록을 거른다.
const ADMIN_ACTOR = 'demo-admin';

export default function AdminDemoPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 관리자 데모 내 화면: 'assign'(사용자에게 결재선 할당) | 'manage'(결재선 관리)
  const [activeTab, setActiveTab] = useState('assign');
  // 미리보기 대상 결재선 { id, name } (null 이면 닫힘)
  const [previewPb, setPreviewPb] = useState(null);
  // 할당 변경 시 카운트/체크 표시 갱신용 토큰
  const [assignVer, setAssignVer] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userRes, pbRes] = await Promise.all([
        listDirectoryUsers({ actor: ADMIN_ACTOR, size: 200 }),
        playbooksApi.list(ADMIN_ACTOR),
      ]);
      setUsers(Array.isArray(userRes?.content) ? userRes.content : []);
      setPlaybooks(Array.isArray(pbRes) ? pbRes : []);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.userId?.toLowerCase().includes(q)
      || u.displayName?.toLowerCase().includes(q)
      || u.departmentName?.toLowerCase().includes(q)
      || u.positionName?.toLowerCase().includes(q)
    );
  }, [users, query]);

  const assignmentsByUser = useMemo(
    // assignVer 를 의존성에 넣어 토글 후 localStorage 를 다시 읽는다
    () => getAllAssignments(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignVer]
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.userId === selectedUserId) || null,
    [users, selectedUserId]
  );

  const assignedIds = useMemo(
    () => (selectedUserId ? getAssignedPlaybookIds(selectedUserId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedUserId, assignVer]
  );

  const handleToggle = (playbookId) => {
    if (!selectedUserId) return;
    toggleAssignment(selectedUserId, playbookId);
    setAssignVer((v) => v + 1);
  };

  const allPlaybookIds = useMemo(() => playbooks.map((pb) => pb.id), [playbooks]);

  // 전체 사용자에 전체 결재선 일괄 할당
  const handleAssignAllToAll = () => {
    if (users.length === 0 || allPlaybookIds.length === 0) return;
    if (!window.confirm(`전체 사용자 ${users.length}명에게 결재선 ${allPlaybookIds.length}개를 모두 할당합니다. 기존 할당은 덮어쓰여집니다.`)) return;
    setUsersAssignments(users.map((u) => u.userId), allPlaybookIds);
    setAssignVer((v) => v + 1);
  };

  // 전체 사용자 할당 해제
  const handleClearAll = () => {
    if (!window.confirm('전체 사용자의 결재선 할당을 모두 해제합니다.')) return;
    clearAllAssignments();
    setAssignVer((v) => v + 1);
  };

  // 선택 사용자에게 전체 결재선 선택 / 전체 해제
  const handleSelectAllForUser = () => {
    if (!selectedUserId) return;
    setUserAssignments(selectedUserId, allPlaybookIds);
    setAssignVer((v) => v + 1);
  };

  const handleClearForUser = () => {
    if (!selectedUserId) return;
    setUserAssignments(selectedUserId, []);
    setAssignVer((v) => v + 1);
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              title="처음으로"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900">관리자 데모</div>
              <div className="text-xs text-slate-500">
                결재선 관리와 사용자별 결재선 할당
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((v) => v + 1)}
              className="text-xs flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              title="접속 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 flex gap-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'assign'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            사용자에게 결재선 할당
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'manage'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            결재선 관리
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {activeTab === 'assign' && (
          <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-sm">
            여기서 한 할당은 이 브라우저의 사용자 데모 화면에만 반영됩니다(localStorage). 결재 서비스(BE)는
            매핑을 저장하지 않으며, 사용자 데모는 기안 시 할당된 결재선만 보여줍니다.
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 break-words">{error}</span>
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

        {activeTab === 'assign' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 사용자 목록 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              <span className="font-semibold text-slate-900 text-sm">사용자</span>
              <span className="text-xs text-slate-400">({filteredUsers.length})</span>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAssignAllToAll}
                  disabled={loading || users.length === 0 || allPlaybookIds.length === 0}
                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
                  title="전체 사용자에 전체 결재선 할당"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  전체 할당
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={loading}
                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  title="전체 사용자 할당 해제"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  할당 해제
                </button>
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름·아이디·부서·직책 검색"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {loading && (
                  <div className="text-sm text-slate-500 py-6 text-center">불러오는 중...</div>
                )}
                {!loading && filteredUsers.length === 0 && (
                  <div className="text-sm text-slate-400 py-6 text-center">사용자가 없습니다.</div>
                )}
                {filteredUsers.map((u) => {
                  const count = (assignmentsByUser[u.userId] || []).length;
                  const active = selectedUserId === u.userId;
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => setSelectedUserId(u.userId)}
                      className={`text-left p-2.5 rounded-lg border transition ${
                        active
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 text-sm truncate">
                          {u.displayName || u.userId}
                        </span>
                        {count > 0 && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                            {count}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {u.userId}
                        {u.departmentName ? ` · ${u.departmentName}` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 결재선 할당 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">결재선 할당</span>
              {selectedUser && (
                <span className="text-xs text-slate-500 truncate">
                  → {selectedUser.displayName || selectedUser.userId}
                </span>
              )}
              {selectedUserId && playbooks.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllForUser}
                    className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    title="전체 결재선 선택"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={handleClearForUser}
                    className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                    title="전체 결재선 선택 해제"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    전체 해제
                  </button>
                </div>
              )}
            </div>
            <div className="p-3">
              {!selectedUserId ? (
                <div className="text-sm text-slate-400 py-10 text-center">
                  왼쪽에서 사용자를 선택하세요.
                </div>
              ) : playbooks.length === 0 ? (
                <div className="text-sm text-slate-500 py-10 text-center">
                  등록된 결재선이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
                  {playbooks.map((pb) => {
                    const checked = assignedIds.includes(pb.id);
                    const usable = pb.effectiveUsable !== false;
                    return (
                      <label
                        key={pb.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                          checked ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(pb.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 text-sm truncate">{pb.name}</span>
                            {!usable && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                사용 불가
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPreviewPb({ id: pb.id, name: pb.name });
                              }}
                              className="ml-auto shrink-0 text-[11px] px-2 py-0.5 border border-slate-300 rounded hover:bg-white"
                              aria-label={`${pb.name} 미리보기`}
                            >
                              미리보기
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">{pb.id}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'manage' && (
          <PlaybookManagePanel
            playbooks={playbooks}
            loading={loading}
            onReload={() => setReloadKey((v) => v + 1)}
            feBase={getFeBase()}
            actor={ADMIN_ACTOR}
            onPreview={(pb) => setPreviewPb(pb)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => setReloadKey((v) => v + 1)}
      />

      <PlaybookPreviewModal
        open={!!previewPb}
        onClose={() => setPreviewPb(null)}
        playbookId={previewPb?.id}
        playbookName={previewPb?.name}
        feBase={getFeBase()}
        actor={ADMIN_ACTOR}
        onOpenSettings={() => { setPreviewPb(null); setSettingsOpen(true); }}
      />
    </div>
  );
}
