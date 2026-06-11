// 플레이북 revision 의 definition JSON 을 읽어 기안 시점에 기안자가
// 결재자를 직접 골라야 하는 노드를 추려낸다.
//
// BE 규칙 요약 (PlaybookCompiler.java 와 Validator 기준):
// - 신규 selectors[] 형식: data.approverMode === 'requestSelect' 인 노드는
//   selectors 합집합 중에서 기안자가 정확히 1명을 골라야 한다 (REQUESTER_SELECT_ONE).
// - 레거시 approvers[] 형식: type='candidatePool', selectionMode='REQUESTER_SELECT_ONE'
//   인 노드는 candidatePool.candidates[] 중 1명을 골라야 한다.
//   (REQUESTER_SELECT_MANY 도 같은 후보군에서 minSelect~maxSelect 명을 고르는 형태지만
//    demo_mock 데모 시나리오는 ONE 만 지원한다.)
//
// 본 모듈은 위 두 형식을 공통 모양으로 변환한다:
//   { nodeId, label, selectionMode: 'REQUESTER_SELECT_ONE',
//     minSelect: 1, maxSelect: 1, selectors: [{kind, ...id, label}] }

const APPROVER_MODE_REQUEST_SELECT = 'requestSelect';
const SELECTION_MODE_REQUESTER_SELECT_ONE = 'REQUESTER_SELECT_ONE';
const SELECTION_MODE_REQUESTER_SELECT_MANY = 'REQUESTER_SELECT_MANY';

function parseDefinition(definitionJsonOrObject) {
  if (definitionJsonOrObject == null) return null;
  if (typeof definitionJsonOrObject === 'object') return definitionJsonOrObject;
  if (typeof definitionJsonOrObject !== 'string') return null;
  try {
    return JSON.parse(definitionJsonOrObject);
  } catch {
    return null;
  }
}

function normalizeSelectorsFromNewFormat(rawSelectors) {
  if (!Array.isArray(rawSelectors)) return [];
  const out = [];
  for (const s of rawSelectors) {
    if (!s || typeof s !== 'object' || !s.kind) continue;
    const label = s.label || '';
    switch (s.kind) {
      case 'user':
        if (s.userId) out.push({ kind: 'user', userId: s.userId, label: label || s.userId });
        break;
      case 'department':
        if (s.deptId) out.push({ kind: 'department', deptId: s.deptId, label: label || s.deptId });
        break;
      case 'position':
        if (s.positionId) out.push({ kind: 'position', positionId: s.positionId, label: label || s.positionId });
        break;
      case 'customGroup':
        if (s.groupId) out.push({ kind: 'customGroup', groupId: s.groupId, label: label || s.groupId });
        break;
      default:
        break;
    }
  }
  return out;
}

function legacyCandidatePoolSelectors(approvers) {
  if (!Array.isArray(approvers)) return null;
  for (const a of approvers) {
    if (!a || typeof a !== 'object') continue;
    if (a.type !== 'candidatePool') continue;
    const pool = a.candidatePool;
    if (!pool || !Array.isArray(pool.candidates)) return null;
    const selectors = pool.candidates
      .filter((c) => c && c.active !== false && c.userId)
      .map((c) => ({ kind: 'user', userId: c.userId, label: c.label || c.userId }));
    return {
      selectors,
      selectionMode: pool.selectionMode || SELECTION_MODE_REQUESTER_SELECT_ONE,
      minSelect: typeof pool.minSelect === 'number' ? pool.minSelect : 1,
      maxSelect: typeof pool.maxSelect === 'number' ? pool.maxSelect : 1,
    };
  }
  return null;
}

// 기안 시점에 기안자가 결재자를 골라야 하는 노드 목록을 반환한다.
// 각 항목 모양:
//   { nodeId, nodeLabel, selectionMode, minSelect, maxSelect, selectors }
export function findRequesterSelectionNodes(definitionJsonOrObject) {
  const def = parseDefinition(definitionJsonOrObject);
  if (!def || !Array.isArray(def.nodes)) return [];
  const out = [];
  for (const node of def.nodes) {
    if (!node || !node.id) continue;
    const data = node.data || {};
    const role = data.role;
    if (role === 'drafter' || role === 'end') continue;
    const nodeLabel = data.stageName || data.label || node.id;

    // 1) 신규 selectors[] + approverMode=requestSelect
    if (data.approverMode === APPROVER_MODE_REQUEST_SELECT
        && Array.isArray(data.selectors) && data.selectors.length > 0) {
      const selectors = normalizeSelectorsFromNewFormat(data.selectors);
      if (selectors.length > 0) {
        out.push({
          nodeId: node.id,
          nodeLabel,
          selectionMode: SELECTION_MODE_REQUESTER_SELECT_ONE,
          minSelect: 1,
          maxSelect: 1,
          selectors,
        });
      }
      continue;
    }

    // 2) 레거시 approvers[] + candidatePool.selectionMode 검사
    const legacy = legacyCandidatePoolSelectors(data.approvers);
    if (legacy && legacy.selectors.length > 0) {
      // ONE / MANY 모두 demo 화면에서는 동일하게 후보 목록을 보여주되,
      // demo_mock 시나리오는 ONE 만 자동 검증한다.
      if (legacy.selectionMode === SELECTION_MODE_REQUESTER_SELECT_ONE
          || legacy.selectionMode === SELECTION_MODE_REQUESTER_SELECT_MANY) {
        out.push({
          nodeId: node.id,
          nodeLabel,
          selectionMode: legacy.selectionMode,
          minSelect: legacy.minSelect,
          maxSelect: legacy.maxSelect,
          selectors: legacy.selectors,
        });
      }
    }
  }
  return out;
}

// "요청자가 사후확인 선택"(기능 A) 노드 목록을 반환한다.
// approverMode 와 무관하게 data.postConfirm===true && data.postConfirmRequesterChoice===true 인 노드.
//   각 항목: { nodeId, nodeLabel }
export function findPostConfirmChoiceNodes(definitionJsonOrObject) {
  const def = parseDefinition(definitionJsonOrObject);
  if (!def || !Array.isArray(def.nodes)) return [];
  const out = [];
  for (const node of def.nodes) {
    if (!node || !node.id) continue;
    const data = node.data || {};
    if (data.role === 'drafter' || data.role === 'end') continue;
    if (data.postConfirm === true && data.postConfirmRequesterChoice === true) {
      out.push({ nodeId: node.id, nodeLabel: data.stageName || data.label || node.id });
    }
  }
  return out;
}

// 선택 상태(selections)가 모든 required 노드에 대해 채워졌는지 검증.
//   selections = { [nodeId]: { selectedApprovers: [userId, ...], postConfirm?: boolean } }
export function validateSelections(requiredNodes, selections) {
  const missing = [];
  for (const node of requiredNodes) {
    const sel = selections?.[node.nodeId];
    const picked = Array.isArray(sel?.selectedApprovers) ? sel.selectedApprovers.filter(Boolean) : [];
    if (picked.length < node.minSelect) {
      missing.push({ nodeId: node.nodeId, nodeLabel: node.nodeLabel, need: node.minSelect, got: picked.length });
    }
  }
  return missing;
}

// createFromPlaybook body 에 실을 assignees[] 로 변환.
export function selectionsToAssignees(requiredNodes, selections) {
  const out = [];
  for (const node of requiredNodes) {
    const sel = selections?.[node.nodeId];
    const picked = Array.isArray(sel?.selectedApprovers) ? sel.selectedApprovers.filter(Boolean) : [];
    if (picked.length === 0) continue;
    if (node.minSelect === 1 && node.maxSelect === 1) {
      out.push({ nodeId: node.nodeId, approver: picked[0] });
    } else {
      out.push({ nodeId: node.nodeId, selectedApprovers: picked });
    }
  }
  return out;
}

// 결재자 선택(approver) + 사후확인 선택(postConfirm)을 nodeId 기준으로 병합한 assignees[] 를 만든다.
// 같은 노드가 양쪽(requestSelect + 사후확인 선택)에 모두 해당하면 한 항목으로 합쳐진다.
// 사후확인은 ON(true)일 때만 전송 — 미선택/OFF 는 BE 에서 일반 결재자로 처리(기본 OFF)되므로 생략.
export function buildAssignees(requiredNodes, postConfirmNodes, selections) {
  const byNodeId = new Map();
  for (const a of selectionsToAssignees(requiredNodes, selections)) {
    byNodeId.set(a.nodeId, { ...a });
  }
  for (const node of (postConfirmNodes || [])) {
    if (selections?.[node.nodeId]?.postConfirm !== true) continue;
    const existing = byNodeId.get(node.nodeId) || { nodeId: node.nodeId };
    existing.postConfirm = true;
    byNodeId.set(node.nodeId, existing);
  }
  return Array.from(byNodeId.values());
}
