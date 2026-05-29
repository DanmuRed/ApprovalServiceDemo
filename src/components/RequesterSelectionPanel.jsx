import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserCheck, Users, Briefcase, Folder, AlertCircle } from 'lucide-react';
import { orgDirectoryApi, describeError } from '../api';

// selector(부서/직책/그룹/사용자) 1건 → 사용자 목록으로 펼친다.
// 결과는 [{ userId, displayName, departmentName, positionName }, ...]
async function expandSelector(actor, selector) {
  if (!selector || !selector.kind) return [];
  switch (selector.kind) {
    case 'user':
      return selector.userId
        ? [{ userId: selector.userId, displayName: selector.label || selector.userId }]
        : [];
    case 'department': {
      if (!selector.deptId) return [];
      const list = await orgDirectoryApi.listDepartmentUsers(actor, selector.deptId);
      return Array.isArray(list) ? list : [];
    }
    case 'position': {
      if (!selector.positionId) return [];
      const list = await orgDirectoryApi.listPositionUsers(actor, selector.positionId);
      return Array.isArray(list) ? list : [];
    }
    case 'customGroup': {
      if (!selector.groupId) return [];
      const list = await orgDirectoryApi.listGroupMembers(actor, selector.groupId);
      return Array.isArray(list) ? list : [];
    }
    default:
      return [];
  }
}

async function expandAllSelectors(actor, selectors) {
  const lists = await Promise.all((selectors || []).map((s) => expandSelector(actor, s).catch(() => [])));
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const u of list) {
      if (!u || !u.userId || seen.has(u.userId)) continue;
      seen.add(u.userId);
      out.push({
        userId: u.userId,
        displayName: u.displayName || u.userId,
        departmentName: u.departmentName || null,
        positionName: u.positionName || null,
      });
    }
  }
  return out;
}

function SelectorChip({ selector }) {
  const Icon = selector.kind === 'department' ? Users
    : selector.kind === 'position' ? Briefcase
      : selector.kind === 'customGroup' ? Folder
        : UserCheck;
  const id = selector.userId || selector.deptId || selector.positionId || selector.groupId || '';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] border border-slate-200">
      <Icon className="w-3 h-3" />
      <span>{selector.label || id}</span>
    </span>
  );
}

function NodeSelectionCard({ actor, node, selection, onChange }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    setError('');
    expandAllSelectors(actor, node.selectors)
      .then((users) => {
        if (!aliveRef.current) return;
        setCandidates(users);
      })
      .catch((e) => {
        if (!aliveRef.current) return;
        setError(describeError(e));
      })
      .finally(() => {
        if (aliveRef.current) setLoading(false);
      });
    return () => { aliveRef.current = false; };
  }, [actor, node.selectors]);

  const selectedApprovers = Array.isArray(selection?.selectedApprovers) ? selection.selectedApprovers : [];
  const singleSelect = node.minSelect === 1 && node.maxSelect === 1;
  const limit = node.maxSelect;

  const toggle = (userId) => {
    if (singleSelect) {
      onChange({ selectedApprovers: [userId] });
      return;
    }
    const set = new Set(selectedApprovers);
    if (set.has(userId)) {
      set.delete(userId);
    } else {
      if (set.size >= limit) return;
      set.add(userId);
    }
    onChange({ selectedApprovers: Array.from(set) });
  };

  const picked = selectedApprovers.length;
  const isComplete = picked >= node.minSelect && picked <= node.maxSelect;

  return (
    <div
      className={`rounded-lg border p-3.5 ${
        isComplete ? 'border-slate-300 bg-white' : 'border-amber-300 bg-amber-50/40'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <UserCheck className={`w-4 h-4 ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span className="font-medium text-slate-900 text-sm">{node.nodeLabel}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {singleSelect ? '1명 선택' : `${node.minSelect}~${node.maxSelect}명 선택`}
          </span>
        </div>
        <span className={`text-[11px] ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
          {isComplete ? '선택 완료' : '선택 필요'}
        </span>
      </div>

      {node.selectors?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-2.5">
          <span className="text-[11px] text-slate-500">후보 조건:</span>
          {node.selectors.map((s, i) => <SelectorChip key={i} selector={s} />)}
        </div>
      )}

      {loading && (
        <div className="text-xs text-slate-500 py-2">결재자 후보 불러오는 중...</div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div className="text-xs text-slate-500 py-2">선택 가능한 결재자 후보가 없습니다.</div>
      )}

      {!loading && candidates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((c) => {
            const isSelected = selectedApprovers.includes(c.userId);
            const disabled = !isSelected && !singleSelect && picked >= limit;
            return (
              <button
                key={c.userId}
                type="button"
                onClick={() => toggle(c.userId)}
                disabled={disabled}
                title={c.userId}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : disabled
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{c.displayName || c.userId}</span>
                {c.departmentName && (
                  <span className={`ml-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    · {c.departmentName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// requiredNodes: findRequesterSelectionNodes(definition) 결과
// selections: { [nodeId]: { selectedApprovers: [userId, ...] } }
export default function RequesterSelectionPanel({ actor, requiredNodes, selections, onChange }) {
  const update = (nodeId, value) => {
    onChange({ ...(selections || {}), [nodeId]: value });
  };

  const missingCount = useMemo(() => {
    let n = 0;
    for (const node of requiredNodes) {
      const picked = (selections?.[node.nodeId]?.selectedApprovers || []).filter(Boolean).length;
      if (picked < node.minSelect) n += 1;
    }
    return n;
  }, [requiredNodes, selections]);

  if (!requiredNodes || requiredNodes.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-slate-700" />
          <span className="text-sm font-semibold text-slate-900">결재자 선택 필요</span>
        </div>
        <span className={`text-[11px] ${missingCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
          {missingCount > 0 ? `미선택 ${missingCount}건` : '모두 선택됨'}
        </span>
      </div>
      <div className="p-3 space-y-2.5">
        <p className="text-[12px] text-slate-600 leading-relaxed">
          아래 단계는 결재선에서 <span className="font-semibold">[요청 시 사용자가 지정]</span> 으로 설정되어
          있어 기안 시점에 결재자를 직접 지정해야 합니다.
        </p>
        {requiredNodes.map((node) => (
          <NodeSelectionCard
            key={node.nodeId}
            actor={actor}
            node={node}
            selection={selections?.[node.nodeId]}
            onChange={(v) => update(node.nodeId, v)}
          />
        ))}
      </div>
    </div>
  );
}
