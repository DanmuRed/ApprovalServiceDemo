import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { playbooksApi, describeError } from '../api';

/**
 * 결재선 미리보기 iframe 모달.
 *
 * 흐름:
 * 1. iframe 으로 ${feBase}/playbooks/${playbookId}/preview 로드 (URL 에 토큰 없음)
 * 2. iframe 마운트 → PREVIEW_READY 메시지 발신
 * 3. 본 모달이 메시지 수신 → event.origin === feBase 검증 → ticket 발급 (POST /playbooks/{id}/preview-tickets)
 * 4. ticket 을 iframe.contentWindow.postMessage({type:'AUTH', ticket}, feBase) 로 전달
 * 5. iframe 내부에서 ticket → PREVIEW_SESSION 쿠키 교환 후 그래프 렌더
 *
 * demo_mock 의 JWT 는 step 3 의 ticket 발급에서만 사용되며, iframe 으로 넘어가지 않는다.
 */
export default function PlaybookPreviewModal({
  open,
  onClose,
  playbookId,
  playbookName,
  feBase,
  actor,
  onOpenSettings,
}) {
  const iframeRef = useRef(null);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);

  const handleMessage = useCallback(async (event) => {
    if (!feBase || !playbookId) return;
    if (event.origin !== feBase) return;
    const data = event.data;
    if (!data || data.type !== 'PREVIEW_READY') return;
    if (data.playbookId && data.playbookId !== playbookId) return;
    if (!event.source) return;

    setFetching(true);
    setError('');
    try {
      const response = await playbooksApi.createPreviewTicket(actor, playbookId);
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
  }, [feBase, playbookId, actor]);

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [open, handleMessage]);

  if (!open) return null;

  const missingConfig = !feBase || !playbookId;
  const iframeSrc = missingConfig
    ? ''
    : `${feBase.replace(/\/$/, '')}/playbooks/${playbookId}/preview`;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[min(1100px,95vw)] h-[min(800px,90vh)] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              결재선 미리보기 · {playbookName || playbookId}
            </h3>
            <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{playbookId}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 relative bg-slate-50">
          {missingConfig ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
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
          ) : (
            <>
              <iframe
                ref={iframeRef}
                title="playbook-preview"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
