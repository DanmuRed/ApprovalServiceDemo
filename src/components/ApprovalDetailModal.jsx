import React, { useContext, useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { approvalsApi, describeError } from '../api';
import {
  approvalStateLabel,
  approvalResultLabel,
  formatDateTime,
  progressPercent,
  stepStateLabel,
} from '../utils';
import { TransitionMetaContext } from '../utils/transitionRegistry';
import { getFeBase } from '../runtimeSettings';
import ApprovalFlowPreview from './ApprovalFlowPreview';

export default function ApprovalDetailModal({ user, approvalId, onClose }) {
  const transitionMetaMap = useContext(TransitionMetaContext);
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await approvalsApi.get(user.userId, approvalId);
      setApproval(data);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalId]);

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{approval?.title || '결재 상세'}</h3>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{approvalId}</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={load}
              className="p-1.5 rounded hover:bg-slate-100"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {approval && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="상태" value={approvalStateLabel(approval.state)} />
                <Stat
                  label="결과"
                  value={approval.result ? approvalResultLabel(approval.result) : '-'}
                />
                <Stat label="기안자" value={approval.requesterId} mono />
                <Stat label="생성" value={formatDateTime(approval.createdAt)} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">진행도</span>
                  <span className="text-xs font-mono text-slate-700">
                    {progressPercent(approval)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 transition-all"
                    style={{ width: `${progressPercent(approval)}%` }}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">진행 흐름</h4>
                <ApprovalFlowPreview
                  approvalId={approvalId}
                  feBase={getFeBase()}
                  actor={user.userId}
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">결재 단계</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">단계</th>
                        <th className="px-3 py-2 text-left">이름</th>
                        <th className="px-3 py-2 text-left">결재자</th>
                        <th className="px-3 py-2 text-left">상태</th>
                        <th className="px-3 py-2 text-left">처리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(approval.steps || []).map((step, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-600">
                            {typeof step.stageIndex === 'number' ? step.stageIndex + 1 : '-'}
                          </td>
                          <td className="px-3 py-2">{step.name || '-'}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {step.delegatedTo
                              ? `${step.delegatedTo} (대결)`
                              : step.approver || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs">{stepStateLabel(step.state)}</span>
                            {step.transitionUsed && (
                              <span className="ml-1 text-xs text-slate-400">
                                · {transitionMetaMap[step.transitionUsed]?.label || step.transitionUsed}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {step.processedBy && <div className="font-mono">{step.processedBy}</div>}
                            {step.processedAt && <div>{formatDateTime(step.processedAt)}</div>}
                            {!step.processedBy && !step.processedAt && '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!approval && loading && (
            <div className="text-center py-12 text-slate-500 text-sm">불러오는 중...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className={`text-sm font-semibold text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}
