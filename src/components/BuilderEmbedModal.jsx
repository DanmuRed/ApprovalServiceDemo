import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { playbooksApi, describeError } from '../api';

/**
 * 편집 가능 빌더 iframe 모달.
 *
 * 흐름(미리보기 모달과 동일한 핸드셰이크, EDIT scope):
 * 1. iframe 으로 ${feBase}/playbooks/${playbookId}/edit-embed (기존) 또는
 *    ${feBase}/playbooks/edit-embed (신규) 로드
 * 2. iframe 마운트 → EMBED_READY 발신
 * 3. 본 모달이 수신 → origin 검증 → EDIT ticket 발급(기존: createEditTicket, 신규: createNewEditTicket)
 * 4. ticket 을 iframe 으로 postMessage({type:'AUTH', ticket}) 전달 → iframe 이 EDIT 세션 쿠키로 교환
 * 5. iframe 내부 저장 성공 시 EMBED_SAVED 수신 → 목록 갱신(onSaved)
 *
 * demo_mock 의 JWT 는 step 3 의 ticket 발급에서만 쓰이며 iframe 으로 넘어가지 않는다.
 */
export default function BuilderEmbedModal({
  open,
  onClose,
  playbookId,
  playbookName,
  feBase,
  actor,
  onSaved,
  onOpenSettings,
}) {
  const iframeRef = useRef(null);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  const isNew = !playbookId;

  const handleMessage = useCallback(async (event) => {
    if (!feBase) return;
    if (event.origin !== feBase) return;
    const data = event.data;
    if (!data) return;

    if (data.type === 'EMBED_SAVED') {
      setSavedNote('저장되었습니다.');
      setTimeout(() => setSavedNote(''), 2500);
      if (onSaved) onSaved(data.playbookId);
      return;
    }

    if (data.type !== 'EMBED_READY') return;
    if (data.playbookId && playbookId && data.playbookId !== playbookId) return;
    if (!event.source) return;

    setFetching(true);
    setError('');
    try {
      const response = isNew
        ? await playbooksApi.createNewEditTicket(actor)
        : await playbooksApi.createEditTicket(actor, playbookId);
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
  }, [feBase, playbookId, actor, isNew, onSaved]);

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    setSavedNote('');
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [open, handleMessage]);

  if (!open) return null;

  const missingConfig = !feBase;
  const iframeSrc = missingConfig
    ? ''
    : isNew
      ? `${feBase.replace(/\/$/, '')}/playbooks/edit-embed`
      : `${feBase.replace(/\/$/, '')}/playbooks/${playbookId}/edit-embed`;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[min(1200px,96vw)] h-[min(860px,92vh)] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {isNew ? '새 결재선 만들기' : `결재선 편집 · ${playbookName || playbookId}`}
            </h3>
            {!isNew && (
              <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{playbookId}</div>
            )}
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
                title="builder-embed"
                src={iframeSrc}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
              {error && (
                <div className="absolute top-3 left-3 right-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm shadow">
                  편집 ticket 발급 실패: {error}
                </div>
              )}
              {fetching && !error && (
                <div className="absolute top-3 right-3 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs shadow">
                  인증 전달 중...
                </div>
              )}
              {savedNote && (
                <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs shadow inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {savedNote}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
