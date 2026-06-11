import React, { useEffect, useMemo, useState } from 'react';
import { FileSignature, RefreshCw, Send, Shuffle } from 'lucide-react';
import { playbooksApi, approvalsApi, describeError } from '../api';
import { getFeBase } from '../runtimeSettings';
import { makeLocalId, makeRandomTitle } from '../utils';
import {
  findRequesterSelectionNodes,
  findPostConfirmChoiceNodes,
  buildAssignees,
  validateSelections,
} from '../playbookSelection';
import { getAssignedPlaybookIds } from '../lineAssignments';
import PlaybookPreviewModal from './PlaybookPreviewModal';
import RequesterSelectionPanel from './RequesterSelectionPanel';

export default function ApplyTab({ user, onCreated, onOpenSettings }) {
  const actor = user.userId;
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  // 선택한 플레이북 revision · 기안자 지정 필요 노드 · 기안자의 선택 상태
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  const [requiredNodes, setRequiredNodes] = useState([]);
  // 기능 A — 요청자가 사후확인 on/off 를 정할 수 있는 노드(approverMode 무관).
  const [postConfirmNodes, setPostConfirmNodes] = useState([]);
  // selections shape: { [nodeId]: { selectedApprovers?: [userId, ...], postConfirm?: boolean } }
  const [selections, setSelections] = useState({});

  const selectedPlaybook = useMemo(
    () => playbooks.find((pb) => pb.id === selectedId) || null,
    [playbooks, selectedId]
  );

  // selectedId 변경 시 latest revision 조회 → 기안자 지정 필요 노드 산출.
  useEffect(() => {
    if (!selectedId) {
      setRequiredNodes([]);
      setPostConfirmNodes([]);
      setSelections({});
      setRevisionError('');
      return;
    }
    let alive = true;
    setRevisionLoading(true);
    setRevisionError('');
    playbooksApi.latestRevision(actor, selectedId)
      .then((rev) => {
        if (!alive) return;
        setRequiredNodes(findRequesterSelectionNodes(rev?.definition));
        setPostConfirmNodes(findPostConfirmChoiceNodes(rev?.definition));
        setSelections({});
      })
      .catch((e) => {
        if (!alive) return;
        setRevisionError(describeError(e));
        setRequiredNodes([]);
        setPostConfirmNodes([]);
        setSelections({});
      })
      .finally(() => {
        if (alive) setRevisionLoading(false);
      });
    return () => { alive = false; };
  }, [actor, selectedId]);

  const missingSelections = useMemo(
    () => validateSelections(requiredNodes, selections),
    [requiredNodes, selections]
  );
  const hasMissingSelections = missingSelections.length > 0;

  const loadPlaybooks = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await playbooksApi.list(actor);
      const all = Array.isArray(list) ? list : [];
      // 관리자 데모에서 이 사용자(actor)에게 할당된 결재선만 노출 (엄격).
      // 결재선 라우팅은 연동 시스템(demo_mock) 책임이므로 매핑은 localStorage 에서 읽는다.
      const assignedIds = getAssignedPlaybookIds(actor);
      const items = all.filter((pb) => assignedIds.includes(pb.id));
      setPlaybooks(items);
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id);
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaybooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  const handleSubmit = async () => {
    if (!selectedId) {
      setError('결재선을 선택하세요.');
      return;
    }
    if (hasMissingSelections) {
      const labels = missingSelections.map((m) => m.nodeLabel).join(', ');
      setError(`결재자를 지정해야 하는 단계가 남아 있습니다: ${labels}`);
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const finalTitle = title.trim() || makeRandomTitle();
      const assignees = buildAssignees(requiredNodes, postConfirmNodes, selections);
      const body = {
        title: finalTitle,
        externalRefId: makeLocalId('demo-ref'),
        playbookId: selectedId,
        contextJson: '{}',
        ...(assignees.length > 0 ? { assignees } : {}),
      };
      const created = await approvalsApi.createFromPlaybook(actor, body);
      // 생성 직후 자동으로 결재 시작
      if (created?.id && created?.state === 'READY') {
        try {
          await approvalsApi.start(actor, created.id);
        } catch (e) {
          // start 실패해도 생성은 성공이므로 메시지만 남긴다
          // 실제 환경에서는 별도 처리
          console.warn('start failed:', e);
        }
      }
      setSuccessMsg(`기안 생성 완료: ${finalTitle}`);
      setTitle('');
      setSelections({});
      onCreated?.(created);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-slate-700" />
            <h2 className="font-semibold text-slate-900">새 결재 기안</h2>
          </div>
          <button
            type="button"
            onClick={loadPlaybooks}
            className="text-xs flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            결재선 새로고침
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">결재선 선택</label>
            {loading ? (
              <div className="text-sm text-slate-500 py-3">결재선 목록을 불러오는 중...</div>
            ) : playbooks.length === 0 ? (
              <div className="text-sm text-slate-500 py-3">
                할당된 결재선이 없습니다. 관리자 데모에서 이 사용자(<span className="font-mono">{actor}</span>)에게
                결재선을 할당하세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {playbooks.map((pb) => {
                  const usable = pb.effectiveUsable !== false;
                  const checked = selectedId === pb.id;
                  return (
                    <label
                      key={pb.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        checked
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-400'
                      } ${!usable ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="radio"
                        name="playbook"
                        value={pb.id}
                        checked={checked}
                        onChange={() => setSelectedId(pb.id)}
                        disabled={!usable}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">{pb.name}</span>
                          {!usable && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              사용 불가
                            </span>
                          )}
                          {checked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPreviewOpen(true);
                              }}
                              className="ml-auto text-xs px-2 py-1 border border-slate-300 rounded hover:bg-white"
                              aria-label={`${pb.name} 미리보기`}
                            >
                              미리보기
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{pb.id}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              제목 <span className="text-slate-400 font-normal">(비워두면 자동 생성)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={makeRandomTitle()}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <button
                type="button"
                onClick={() => setTitle(makeRandomTitle())}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm flex items-center gap-1"
                title="랜덤 제목"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {revisionLoading && (
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm">
              결재선 정보 분석 중...
            </div>
          )}
          {revisionError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              결재선 분석 실패: {revisionError}
            </div>
          )}

          {!revisionLoading && (requiredNodes.length > 0 || postConfirmNodes.length > 0) && (
            <RequesterSelectionPanel
              actor={actor}
              requiredNodes={requiredNodes}
              postConfirmNodes={postConfirmNodes}
              selections={selections}
              onChange={setSelections}
            />
          )}

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
              {successMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedId || revisionLoading || hasMissingSelections}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={hasMissingSelections ? '결재자 지정이 필요한 단계가 있습니다.' : undefined}
          >
            <Send className="w-4 h-4" />
            {submitting
              ? '기안 생성 중...'
              : hasMissingSelections
                ? `결재자 선택 필요 (${missingSelections.length})`
                : '기안 생성'}
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 px-1">
        기안자: <span className="font-mono">{user.userId}</span>
        {user.displayName && <> · {user.displayName}</>}
        {user.departmentName && <> · {user.departmentName}</>}
      </div>

      <PlaybookPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        playbookId={selectedId}
        playbookName={selectedPlaybook?.name}
        feBase={getFeBase()}
        actor={actor}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
