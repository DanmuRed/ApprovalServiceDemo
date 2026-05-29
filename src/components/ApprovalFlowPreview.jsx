import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { approvalsApi, describeError } from '../api';

/**
 * 결재 흐름도 iframe 임베드 (인라인). fe 의 History 화면과 동일한 워크플로우 그래프를 보여준다.
 *
 * 흐름 (결재선 미리보기와 동형):
 * 1. iframe 으로 ${feBase}/approvals/${approvalId}/preview 로드 (URL 에 토큰 없음)
 * 2. iframe 마운트 → PREVIEW_READY 메시지 발신
 * 3. 본 컴포넌트가 메시지 수신 → event.origin === feBase 검증 → ticket 발급
 *    (POST /approvals/{id}/preview-tickets)
 * 4. ticket 을 iframe 으로 postMessage({type:'AUTH', ticket}, feBase) 전달
 * 5. iframe 내부에서 ticket → PREVIEW_SESSION 쿠키 교환 후 그래프 렌더
 *
 * demo_mock 의 JWT/actor 는 step 3 의 ticket 발급에서만 사용되며 iframe 으로 넘어가지 않는다.
 */
export default function ApprovalFlowPreview({ approvalId, feBase, actor, onOpenSettings }) {
  const iframeRef = useRef(null);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);

  const handleMessage = useCallback(async (event) => {
    if (!feBase || !approvalId) return;
    if (event.origin !== feBase) return;
    const data = event.data;
    if (!data || data.type !== 'PREVIEW_READY') return;
    if (data.approvalId && data.approvalId !== approvalId) return;
    if (!event.source) return;

    setFetching(true);
    setError('');
    try {
      const response = await approvalsApi.createPreviewTicket(actor, approvalId);
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
  }, [feBase, approvalId, actor]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  const missingConfig = !feBase || !approvalId;
  const iframeSrc = missingConfig
    ? ''
    : `${feBase.replace(/\/$/, '')}/approvals/${approvalId}/preview`;

  if (missingConfig) {
    return (
      <div className="w-full h-[460px] border border-slate-200 rounded-lg bg-slate-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-sm text-slate-600">
          FE Base URL 이 설정되지 않았습니다. 설정 모달에서 입력 후 다시 시도하세요.
        </div>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-white inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            설정 열기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-[460px] relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
      <iframe
        ref={iframeRef}
        title="approval-flow-preview"
        src={iframeSrc}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
      {error && (
        <div className="absolute top-3 left-3 right-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm shadow">
          미리보기 ticket 발급 실패: {error}
        </div>
      )}
      {fetching && !error && (
        <div className="absolute top-3 right-3 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs shadow">
          인증 전달 중...
        </div>
      )}
    </div>
  );
}
