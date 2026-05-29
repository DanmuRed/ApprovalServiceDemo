import React, { useEffect, useState } from 'react';
import { Inbox, RefreshCw, ChevronRight } from 'lucide-react';
import { approvalsApi, describeError } from '../api';
import { approvalStateLabel, approvalResultLabel, formatDateTime } from '../utils';
import ApprovalDetailModal from './ApprovalDetailModal';

export default function MyRequestsTab({ user, refreshKey }) {
  const actor = user.userId;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await approvalsApi.list(actor, { requesterId: actor, size: 50 });
      const list = Array.isArray(res?.items) ? res.items : [];
      // 최신 생성순
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      setItems(list);
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

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-slate-700" />
          <h2 className="font-semibold text-slate-900">내가 올린 결재</h2>
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
          <div className="p-10 text-center text-slate-500 text-sm">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            올린 결재가 없습니다. 신청 탭에서 새 결재를 생성하세요.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 group"
                >
                  <StateBadge item={item} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{item.title || '(제목 없음)'}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="font-mono">{item.id.slice(0, 8)}…</span>
                      <span>생성 {formatDateTime(item.createdAt)}</span>
                      {item.completedAt && <span>종결 {formatDateTime(item.completedAt)}</span>}
                      <span>현재 단계 {typeof item.currentStep === 'number' ? item.currentStep + 1 : '-'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                </button>
              </li>
            ))}
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

function StateBadge({ item }) {
  const { state, result } = item;
  let cls = 'bg-slate-100 text-slate-600 border-slate-200';
  let label = approvalStateLabel(state);

  if (state === 'IN_PROGRESS') {
    cls = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (state === 'READY') {
    cls = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (state === 'COMPLETED') {
    if (result === 'APPROVED') {
      cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = '승인';
    } else if (result === 'REJECTED') {
      cls = 'bg-red-50 text-red-700 border-red-200';
      label = '반려';
    } else if (result === 'WITHDRAWN') {
      cls = 'bg-orange-50 text-orange-700 border-orange-200';
      label = '회수';
    } else {
      cls = 'bg-slate-100 text-slate-700 border-slate-200';
      label = approvalResultLabel(result) || '종결';
    }
  } else if (state === 'CANCELED') {
    cls = 'bg-slate-100 text-slate-500 border-slate-200';
    label = '취소';
  }

  return (
    <span className={`inline-block w-16 text-center text-xs px-2 py-1 border rounded ${cls}`}>
      {label}
    </span>
  );
}
