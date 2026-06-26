// 기안 시점에 기안자가 직접 정해야 하는 항목(결재자 선택 / 사후확인 선택)을 추려낸다.
//
// - 결재자 선택(requesterSelect): 서버의 `GET /playbooks/{id}/candidate-pools` 가
//   requesterSelect 옵션 노드를 후보까지 펼쳐서 내려준다. 본 모듈은 그 응답을
//   화면이 쓰는 공통 모양으로 변환만 한다(클라이언트에서 selector 를 직접 펼치지 않는다).
// - 사후확인 선택(기능 A): candidate-pools 에는 없으므로 revision 의 definition JSON 에서 추출한다.
//
// requiredNode 공통 모양:
//   { nodeId, nodeLabel, selectionMode: 'REQUESTER_SELECT_ONE',
//     minSelect: 1, maxSelect: 1, candidates: [{ userId, displayName, sourceName }] }

const SELECTION_MODE_REQUESTER_SELECT_ONE = 'REQUESTER_SELECT_ONE';

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

// candidate-pools API 응답을 RequesterSelectionPanel 이 쓰는 requiredNodes 모양으로 변환한다.
// 서버가 requesterSelect 노드만, 후보까지 펼쳐서 준다(REQUESTER_SELECT_ONE = 1명 선택).
//   응답: { nodes: [{ nodeId, label, stageName, candidates: [{ userId, displayName, sourceRef }] }] }
export function candidatePoolsToRequiredNodes(response) {
  const nodes = response && Array.isArray(response.nodes) ? response.nodes : [];
  return nodes
    .filter((n) => n && n.nodeId)
    .map((n) => ({
      nodeId: n.nodeId,
      nodeLabel: n.stageName || n.label || n.nodeId,
      selectionMode: SELECTION_MODE_REQUESTER_SELECT_ONE,
      minSelect: 1,
      maxSelect: 1,
      candidates: (Array.isArray(n.candidates) ? n.candidates : [])
        .filter((c) => c && c.userId)
        .map((c) => ({
          userId: c.userId,
          displayName: c.displayName || c.userId,
          sourceName: c.sourceRef && c.sourceRef.name ? c.sourceRef.name : null,
        })),
    }));
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
// 같은 노드가 양쪽(requesterSelect + 사후확인 선택)에 모두 해당하면 한 항목으로 합쳐진다.
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
