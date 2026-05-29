import React, { useState } from 'react';
import { Plus, Pencil, Eye, FileText } from 'lucide-react';
import BuilderEmbedModal from './BuilderEmbedModal';

/**
 * 결재선 관리 패널: 결재선 목록 조회 + 신규 생성/편집(임베드 빌더).
 * 미리보기는 상위(AdminDemoPage)의 PlaybookPreviewModal 을 onPreview 로 위임받는다.
 */
export default function PlaybookManagePanel({
  playbooks,
  loading,
  onReload,
  feBase,
  actor,
  onPreview,
  onOpenSettings,
}) {
  // 편집/생성 모달 대상. { id, name } 면 기존 편집, { id: null } 이면 신규 생성.
  const [editTarget, setEditTarget] = useState(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-700" />
        <span className="font-semibold text-slate-900 text-sm">결재선 목록</span>
        <span className="text-xs text-slate-400">({playbooks.length})</span>
        <button
          type="button"
          onClick={() => setEditTarget({ id: null, name: '' })}
          className="ml-auto text-[11px] flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          title="새 결재선 만들기"
        >
          <Plus className="w-3.5 h-3.5" />
          새 결재선
        </button>
      </div>
      <div className="p-3">
        {loading ? (
          <div className="text-sm text-slate-500 py-10 text-center">불러오는 중...</div>
        ) : playbooks.length === 0 ? (
          <div className="text-sm text-slate-400 py-10 text-center">
            등록된 결재선이 없습니다. "새 결재선" 으로 만들어보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 max-h-[64vh] overflow-y-auto pr-1">
            {playbooks.map((pb) => {
              const usable = pb.effectiveUsable !== false;
              return (
                <div
                  key={pb.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm truncate">{pb.name}</span>
                      {!usable && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          사용 불가
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{pb.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPreview && onPreview({ id: pb.id, name: pb.name })}
                    className="shrink-0 text-[11px] flex items-center gap-1 px-2 py-1 border border-slate-300 rounded hover:bg-slate-50"
                    aria-label={`${pb.name} 미리보기`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    미리보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTarget({ id: pb.id, name: pb.name })}
                    className="shrink-0 text-[11px] flex items-center gap-1 px-2 py-1 border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50"
                    aria-label={`${pb.name} 편집`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    편집
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BuilderEmbedModal
        open={!!editTarget}
        onClose={() => {
          setEditTarget(null);
          if (onReload) onReload();
        }}
        playbookId={editTarget?.id || undefined}
        playbookName={editTarget?.name}
        feBase={feBase}
        actor={actor}
        onSaved={() => {
          if (onReload) onReload();
        }}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
