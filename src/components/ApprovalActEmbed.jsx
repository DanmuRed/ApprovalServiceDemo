import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { approvalsApi, describeError } from '../api';

/**
 * 결재 처리(ACT) iframe 임베드 (parent 측 데모). 결재자가 iframe 안에서 직접 승인/반려/커스텀을 실행한다.
 *
 * 흐름 (결재 흐름도 미리보기와 동형이되 결재자 바인딩이 추가됨):
 * 1. "결재자 userId" 입력 후 화면 열기 → iframe 으로 ${feBase}/approvals/${approvalId}/act-embed 로드
 * 2. iframe 마운트 → ACT_READY 메시지 발신
 * 3. 본 컴포넌트가 수신 → event.origin === feBase 검증 → 결재자 userId 를 담아 ACT ticket 발급
 *    (POST /approvals/{id}/act-tickets, body { actorUserId })
 * 4. ticket 을 iframe 으로 postMessage({type:'AUTH', ticket}, feBase) 전달
 * 5. iframe 내부에서 ticket → ACT scope PREVIEW_SESSION 쿠키 교환 후 처리 버튼 렌더
 * 6. 결재 처리 성공 시 iframe → ACT_DONE 발신 → onActed 콜백으로 상위가 상태를 갱신
 *
 * demo_mock 의 JWT/actor 는 step 3 의 ticket 발급에서만 쓰이며 iframe 으로 넘어가지 않는다.
 * 결재 주체는 ticket 에 바인딩된 actorUserId 다.
 */
export default function ApprovalActEmbed({ approvalId, feBase, actor, defaultActorUserId = '', onActed }) {
  const [actorUserId, setActorUserId] = useState(defaultActorUserId);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // handleMessage 클로저가 항상 최신 입력값을 읽도록 ref 로 유지(리스너 재등록 회피).
  const actorRef = useRef(actorUserId);
  actorRef.current = actorUserId;

  const handleMessage = useCallback(async (event) => {
    if (!feBase || !approvalId) return;
    if (event.origin !== feBase) return;
    const data = event.data;
    if (!data) return;

    if (data.type === 'ACT_DONE') {
      if (data.approvalId && data.approvalId !== approvalId) return;
      setLastResult(data);
      if (onActed) onActed(data);
      return;
    }

    if (data.type !== 'ACT_READY') return;
    if (data.approvalId && data.approvalId !== approvalId) return;
    if (!event.source) return;
    if (!actorRef.current) {
      setError('결재자 userId 를 입력하세요.');
      return;
    }

    setFetching(true);
    setError('');
    try {
      const response = await approvalsApi.createActTicket(actor, approvalId, actorRef.current);
      const ticket = response?.ticket;
      if (!ticket) {
        throw new Error('No ticket returned from BE.');
      }
      event.source.postMessage({ type: 'AUTH', ticket }, feBase);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setFetching(false);
    }
  }, [feBase, approvalId, actor, onActed]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  if (!feBase || !approvalId) {
    return (
      <div className="w-full border border-slate-200 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 inline-flex items-center gap-2">
        <ExternalLink className="w-3.5 h-3.5" />
        FE Base URL 이 설정되지 않았습니다. 설정 모달에서 입력 후 다시 시도하세요.
      </div>
    );
  }

  const iframeSrc = `${feBase.replace(/\/$/, '')}/approvals/${approvalId}/act-embed`;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 mb-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">결재자 userId</span>
          <input
            value={actorUserId}
            onChange={(e) => setActorUserId(e.target.value)}
            placeholder="user-2001"
            disabled={opened}
            className="px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded disabled:bg-slate-100"
          />
        </label>
        {!opened ? (
          <button
            type="button"
            onClick={() => {
              if (!actorUserId.trim()) {
                setError('결재자 userId 를 입력하세요.');
                return;
              }
              setError('');
              setLastResult(null);
              setOpened(true);
            }}
            className="px-3 py-1.5 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            결재 처리 화면 열기
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpened(false)}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50"
          >
            닫기
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 mb-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          결재 처리 ticket 발급 실패: {error}
        </div>
      )}
      {lastResult && (
        <div className="px-4 py-2 mb-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
          처리 완료: {lastResult.slug} → 상태 {lastResult.state}
          {lastResult.result ? ` · 결과 ${lastResult.result}` : ''}
        </div>
      )}

      {opened && (
        <div className="w-full h-[460px] relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
          <iframe
            title="approval-act-embed"
            src={iframeSrc}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
          {fetching && !error && (
            <div className="absolute top-3 right-3 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs shadow">
              인증 전달 중...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
