import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Frame, ExternalLink } from 'lucide-react';
import { approvalsApi, describeError } from '../api';

/**
 * 결재 처리(ACT) iframe 임베드 (parent 측 데모). 결재자가 iframe 안에서 직접 승인/반려/커스텀을 실행한다.
 *
 * 결재자(actorUserId)는 입력받지 않고 prop 으로 바인딩한다 — 데모에서는 로그인 사용자가 곧 결재자다.
 * 마운트되면 곧바로 iframe 을 로드하며, "외부 시스템 안에 박힌 approval_service 화면" 임을
 * 점선 크롬(배지·주소·iframe embed 태그)으로 시각화한다.
 *
 * 흐름:
 * 1. iframe 으로 ${feBase}/approvals/${approvalId}/act-embed 로드
 * 2. iframe 마운트 → ACT_READY 메시지 발신
 * 3. 본 컴포넌트가 수신 → event.origin === feBase 검증 → actorUserId 를 담아 ACT ticket 발급
 *    (POST /approvals/{id}/act-tickets, body { actorUserId })
 * 4. ticket 을 iframe 으로 postMessage({type:'AUTH', ticket}, feBase) 전달
 * 5. iframe 내부에서 ticket → ACT scope PREVIEW_SESSION 쿠키 교환 후 처리 버튼 렌더
 * 6. 결재 처리 성공 시 iframe → ACT_DONE 발신 → onActed 콜백으로 상위가 상태를 갱신
 *
 * demo_mock 의 JWT/actor 는 step 3 의 ticket 발급에서만 쓰이며 iframe 으로 넘어가지 않는다.
 * 결재 주체는 ticket 에 바인딩된 actorUserId 다.
 */
export default function ApprovalActEmbed({ approvalId, feBase, actor, actorUserId, onActed }) {
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // handleMessage 클로저가 항상 최신 결재자 값을 읽도록 ref 로 유지(리스너 재등록 회피).
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
      setError('결재자 userId 가 없습니다.');
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

  const normalizedBase = feBase.replace(/\/$/, '');
  const iframeSrc = `${normalizedBase}/approvals/${approvalId}/act-embed`;
  const displayUrl = `${normalizedBase.replace(/^https?:\/\//, '')}/approvals/${approvalId}/act-embed`;

  return (
    <div>
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

      {/* 임베드 크롬 — "외부 시스템 안에 박힌 approval_service 화면" 임을 점선 프레임으로 표시 */}
      <div className="rounded-lg border-2 border-dashed border-blue-300 overflow-hidden bg-white">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-b border-dashed border-blue-200">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white text-blue-700 whitespace-nowrap">
            approval_service
          </span>
          <span className="flex-1 min-w-0 text-[11px] text-blue-600 font-mono truncate">{displayUrl}</span>
          <span className="text-[11px] text-blue-600 inline-flex items-center gap-1 whitespace-nowrap">
            <Frame className="w-3 h-3" />
            iframe embed
          </span>
        </div>
        <div className="w-full h-[460px] relative bg-slate-50">
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
      </div>
    </div>
  );
}
