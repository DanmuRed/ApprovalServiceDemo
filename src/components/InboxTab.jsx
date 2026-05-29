import React, { useContext, useEffect, useState } from 'react';
import { ClipboardCheck, RefreshCw, ChevronRight } from 'lucide-react';
import { approvalsApi, describeError } from '../api';
import { formatDateTime, findPendingStepForUser } from '../utils';
import { TransitionMetaContext } from '../utils/transitionRegistry';
import ApprovalDetailModal from './ApprovalDetailModal';

// 코멘트(사유) 입력을 요구하는 슬러그 화이트리스트.
// 백엔드 메타에 requiresComment 플래그가 추가되면 이 상수 대신 메타 필드로 분기한다.
const SLUGS_REQUIRING_COMMENT = new Set(['reject']);
const COMMENT_PROMPT_LABEL = {
  reject: '반려 사유를 입력하세요 (선택)',
};

export default function InboxTab({ user, refreshKey, onActed }) {
  const actor = user.userId;
  const transitionMetaMap = useContext(TransitionMetaContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');
  const [actingId, setActingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // 진행 중 결재 전체를 받아서 클라이언트에서 "내가 결재할 차례" 만 필터링.
      // BE 에 inbox 전용 엔드포인트가 없어 detail 호출로 steps[] 를 본다. (데모 한정)
      const res = await approvalsApi.list(actor, { states: ['IN_PROGRESS'], size: 100 });
      const list = Array.isArray(res?.items) ? res.items : [];
      const detailed = await Promise.all(
        list.map(async (item) => {
          try {
            const detail = await approvalsApi.get(actor, item.id);
            const myStep = findPendingStepForUser(detail, actor);
            return myStep ? { item, detail, myStep } : null;
          } catch {
            return null;
          }
        }),
      );
      const filtered = detailed.filter(Boolean);
      filtered.sort((a, b) =>
        String(b.item.createdAt || '').localeCompare(String(a.item.createdAt || '')));
      setItems(filtered);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, refreshKey]);

  const handleAct = async (approvalId, slug) => {
    let comment;
    if (SLUGS_REQUIRING_COMMENT.has(slug)) {
      // eslint-disable-next-line no-alert
      const v = window.prompt(COMMENT_PROMPT_LABEL[slug] || '사유를 입력하세요 (선택)');
      if (v === null) return; // 취소
      comment = v || undefined;
    }
    setActingId(approvalId);
    setError('');
    try {
      await approvalsApi.transition(actor, approvalId, slug, { comment });
      await load();
      onActed?.();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setActingId('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-slate-700" />
          <h2 className="font-semibold text-slate-900">내가 처리할 결재</h2>
          <span className="text-xs text-slate-500">({items.length}건)</span>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">결재함을 불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            지금 결재할 건이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map(({ item, detail, myStep }) => {
              const isActing = actingId === item.id;
              const stage = typeof myStep.stageIndex === 'number' ? myStep.stageIndex + 1 : '-';
              return (
                <li key={item.id} className="px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-16 text-center text-xs px-2 py-1 border rounded bg-blue-50 text-blue-700 border-blue-200">
                      {stage}단계
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenId(item.id)}
                      className="flex-1 min-w-0 text-left group"
                    >
                      <div className="font-medium text-slate-900 truncate group-hover:underline">
                        {item.title || '(제목 없음)'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>기안자 <span className="font-mono">{item.requesterId}</span></span>
                        <span>{formatDateTime(item.createdAt)}</span>
                        <span>현재 단계: {myStep.name || '-'}</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {(detail.availableTransitions || []).map((slug) => {
                        const meta = transitionMetaMap[slug];
                        const Icon = meta?.icon;
                        const label = meta?.label || slug;
                        const buttonClass = meta?.buttonClass
                          || 'bg-slate-600 text-white hover:bg-slate-700';
                        return (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => handleAct(item.id, slug)}
                            disabled={isActing}
                            className={`px-2.5 py-1.5 text-xs rounded disabled:opacity-50 flex items-center gap-1 ${buttonClass}`}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {label}
                          </button>
                        );
                      })}
                      {(detail.availableTransitions || []).length === 0 && (
                        <span className="text-xs text-slate-400 italic">처리 가능 항목 없음</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenId(item.id)}
                        className="px-1.5 py-1.5 text-slate-400 hover:text-slate-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {openId && (
        <ApprovalDetailModal
          user={user}
          approvalId={openId}
          onClose={() => setOpenId('')}
        />
      )}
    </div>
  );
}
