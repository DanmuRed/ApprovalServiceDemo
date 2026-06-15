import React, { useContext, useEffect, useState } from 'react';
import { X, RefreshCw, Plug, Frame } from 'lucide-react';
import { approvalsApi, describeError } from '../api';
import {
  approvalStateLabel,
  approvalResultLabel,
  formatDateTime,
  progressPercent,
  stepStateLabel,
  findPendingStepForUser,
} from '../utils';
import { TransitionMetaContext } from '../utils/transitionRegistry';
import { getFeBase } from '../runtimeSettings';
import ApprovalFlowPreview from './ApprovalFlowPreview';
import ApprovalActEmbed from './ApprovalActEmbed';

export default function ApprovalDetailModal({ user, approvalId, onClose }) {
  const transitionMetaMap = useContext(TransitionMetaContext);
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 결재 처리 방식: 'direct'(직접 API 연동) | 'embed'(iframe 임베드)
  const [actMode, setActMode] = useState('direct');
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);
  const [actError, setActError] = useState('');

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

  // 방식 ① 직접 API 연동: demo_mock 이 직접 transition 을 호출(actor 헤더 = 로그인 사용자).
  const handleDirectAct = async (slug) => {
    setActing(true);
    setActError('');
    try {
      await approvalsApi.transition(user.userId, approvalId, slug, {
        comment: comment.trim() || undefined,
      });
      setComment('');
      await load();
    } catch (e) {
      setActError(describeError(e));
    } finally {
      setActing(false);
    }
  };

  const myStep = approval ? findPendingStepForUser(approval, user.userId) : null;
  const canActAsMe = approval?.state === 'IN_PROGRESS' && !!myStep;
  const availableTransitions = Array.isArray(approval?.availableTransitions)
    ? approval.availableTransitions
    : [];
  const currentApproverName = approval?.currentApprover
    ? (approval.userDisplayNames?.[approval.currentApprover] || approval.currentApprover)
    : null;

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

              {canActAsMe ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-slate-900">결재 처리</h4>
                    <div className="inline-flex p-0.5 gap-0.5 bg-slate-100 rounded-lg">
                      <SegButton
                        active={actMode === 'direct'}
                        onClick={() => setActMode('direct')}
                        Icon={Plug}
                        label="① 직접 API 연동"
                      />
                      <SegButton
                        active={actMode === 'embed'}
                        onClick={() => setActMode('embed')}
                        Icon={Frame}
                        label="② iframe 임베드"
                      />
                    </div>
                  </div>

                  {actMode === 'direct' ? (
                    <>
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                        연동 시스템(demo_mock)이 직접{' '}
                        <span className="font-mono">POST /transitions</span> 를{' '}
                        <span className="font-mono">X-Approval-Actor: {user.userId}</span> 헤더로 호출합니다.
                      </p>
                      <div className="mb-3">
                        <ApprovalFlowPreview
                          approvalId={approvalId}
                          feBase={getFeBase()}
                          actor={user.userId}
                        />
                      </div>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="결재 의견 (선택)"
                        rows={2}
                        maxLength={2000}
                        className="w-full resize-y rounded-lg border border-slate-300 px-2.5 py-2 text-sm mb-2"
                      />
                      {actError && (
                        <div className="px-3 py-2 mb-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                          {actError}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {availableTransitions.map((slug) => {
                          const meta = transitionMetaMap[slug];
                          const Icon = meta?.icon;
                          const label = meta?.label || slug;
                          const buttonClass = meta?.buttonClass
                            || 'bg-slate-600 text-white hover:bg-slate-700';
                          return (
                            <button
                              key={slug}
                              type="button"
                              disabled={acting}
                              onClick={() => handleDirectAct(slug)}
                              className={`px-3.5 py-2 text-sm font-medium rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 ${buttonClass}`}
                            >
                              {Icon && <Icon className="w-4 h-4" />}
                              {label}
                            </button>
                          );
                        })}
                        {availableTransitions.length === 0 && (
                          <span className="text-xs text-slate-400 italic">처리 가능 항목 없음</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                        approval_service 의 결재 화면을 iframe 으로 그대로 임베드합니다. 결재자는 1회용 ACT ticket 에 바인딩되며(
                        <span className="font-mono">{user.userId}</span>), actor 헤더는 전송하지 않습니다.
                      </p>
                      <ApprovalActEmbed
                        approvalId={approvalId}
                        feBase={getFeBase()}
                        actor={user.userId}
                        actorUserId={user.userId}
                        onActed={load}
                      />
                    </>
                  )}
                </div>
              ) : (
                <>
                  {approval.state === 'IN_PROGRESS' && (
                    <div className="px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
                      현재 결재 차례: <span className="font-mono">{currentApproverName || '-'}</span>.
                      {' '}본인 차례일 때 결재함에서 처리할 수 있습니다.
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">진행 흐름</h4>
                    <ApprovalFlowPreview
                      approvalId={approvalId}
                      feBase={getFeBase()}
                      actor={user.userId}
                    />
                  </div>
                </>
              )}

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

function SegButton({ active, onClick, Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 transition ${
        active
          ? 'bg-white text-slate-900 border border-slate-300 font-medium shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
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
