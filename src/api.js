// demo_mock 의 BE API 클라이언트.
// - 인증은 X-Approval-Actor(로그인한 사용자 ID) + 선택적 Bearer JWT.
// - JWT/Base 는 runtimeSettings 에서 매 호출 시 읽는다
//   (헤더의 ⚙️ 설정 모달로 변경 가능, localStorage 영속화).
import { getApiBase, getApiToken } from './runtimeSettings';

function makeIdempotencyKey(prefix) {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

export async function apiRequest(path, {
  method = 'GET',
  actor,
  idempotencyPrefix,
  body,
} = {}) {
  const headers = {};
  const token = getApiToken();
  if (actor) headers['X-Approval-Actor'] = actor;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (idempotencyPrefix) headers['Idempotency-Key'] = makeIdempotencyKey(idempotencyPrefix);
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = payload;
    throw err;
  }
  return payload;
}

// 인사연동 사용자 목록 (관리자 사용자가 아님). 로그인 화면에서 선택용.
export function listDirectoryUsers({ actor = 'demo-mock', q, page = 0, size = 100 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('status', 'ACTIVE');
  params.set('page', String(page));
  params.set('size', String(size));
  return apiRequest(`/org-directory/users?${params.toString()}`, { actor });
}

export const playbooksApi = {
  list: (actor) => apiRequest('/playbooks', { actor }),
  // 최신 revision (definition JSON 포함). 기안 시점에 REQUESTER_SELECT_ONE 노드를
  // 찾아내고 그 candidatePool 후보를 펼치기 위해 사용한다.
  latestRevision: (actor, playbookId) =>
    apiRequest(`/playbooks/${playbookId}/revisions/latest`, { actor }),

  // 결재선 미리보기 iframe 임베드용 1회용 ticket 발급. demo_mock 의 JWT 로 호출,
  // 응답 ticket 은 iframe(fe/) 으로 postMessage 전달되어 PREVIEW_SESSION 쿠키로 교환된다.
  createPreviewTicket: (actor, playbookId) =>
    apiRequest(`/playbooks/${playbookId}/preview-tickets`, {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-preview-ticket',
    }),

  // 편집 빌더 iframe 임베드용 1회용 EDIT ticket 발급(기존 결재선 편집). 응답 ticket 은
  // iframe(fe/ edit-embed) 으로 전달되어 EDIT scope PREVIEW_SESSION 쿠키로 교환된다.
  createEditTicket: (actor, playbookId) =>
    apiRequest(`/playbooks/${playbookId}/edit-tickets`, {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-edit-ticket',
    }),

  // 신규 생성용 EDIT ticket 발급(playbookId 미바인딩). 첫 저장 시 BE 가 새 id 를 세션에 바인딩한다.
  createNewEditTicket: (actor) =>
    apiRequest('/playbooks/edit-tickets', {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-edit-ticket-new',
    }),
};

// 조직도(인사연동) API. selector(부서/직책/그룹) 펼침과 사용자 단건 조회에 사용한다.
// REQUESTER_SELECT_ONE 노드의 후보 목록을 만들 때 호출.
export const orgDirectoryApi = {
  listDepartmentUsers: (actor, deptId, { includeSubtree = false } = {}) => {
    const qs = includeSubtree ? '?includeSubtree=true' : '';
    return apiRequest(`/org-directory/departments/${encodeURIComponent(deptId)}/users${qs}`, { actor });
  },
  listPositionUsers: (actor, positionId) =>
    apiRequest(`/org-directory/positions/${encodeURIComponent(positionId)}/users`, { actor }),
  listGroupMembers: (actor, groupId) =>
    apiRequest(`/org-directory/groups/${encodeURIComponent(groupId)}/members`, { actor }),
  searchUsers: (actor, { q, page = 0, size = 20 } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('status', 'ACTIVE');
    params.set('page', String(page));
    params.set('size', String(size));
    return apiRequest(`/org-directory/users?${params.toString()}`, { actor });
  },
};

export const approvalsApi = {
  list: (actor, { requesterId, states, page = 0, size = 50 } = {}) => {
    const params = new URLSearchParams();
    if (requesterId) params.set('requesterId', requesterId);
    if (Array.isArray(states)) {
      states.filter(Boolean).forEach((s) => params.append('state', s));
    }
    params.set('page', String(page));
    params.set('size', String(size));
    return apiRequest(`/approvals?${params.toString()}`, { actor });
  },

  // 결재자 inbox: actor(X-Approval-Actor)가 지금 처리할 차례인 진행 중 결재만 단일 호출로 반환.
  // 항목에 myStepStageIndex/myStepName/availableTransitions[] 가 포함되어 detail 페치 없이 결재함을 그린다.
  inbox: (actor, { page = 0, size = 50 } = {}) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    return apiRequest(`/approvals/inbox?${params.toString()}`, { actor });
  },

  // 기안자 outbox: actor(X-Approval-Actor) 본인이 올린 결재만 단일 호출로 반환.
  // GET /approvals 와 동일한 ApprovalPageResponse 형태지만 requesterId 가 헤더 actor 로 강제되어
  // 임의 기안자 조회가 불가하다(결재자 inbox 와 대칭).
  outbox: (actor, { states, page = 0, size = 50 } = {}) => {
    const params = new URLSearchParams();
    if (Array.isArray(states)) {
      states.filter(Boolean).forEach((s) => params.append('state', s));
    }
    params.set('page', String(page));
    params.set('size', String(size));
    return apiRequest(`/approvals/outbox?${params.toString()}`, { actor });
  },

  createFromPlaybook: (actor, body) =>
    apiRequest('/approvals/from-playbook', {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-create',
      body,
    }),

  start: (actor, approvalId) =>
    apiRequest(`/approvals/${approvalId}/start`, {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-start',
    }),

  get: (actor, approvalId) =>
    apiRequest(`/approvals/${approvalId}`, { actor }),

  // 결재 흐름도 iframe 임베드용 1회용 ticket 발급. demo_mock 의 actor/JWT 로 호출하고,
  // 응답 ticket 은 iframe(fe/) 으로 postMessage 전달되어 PREVIEW_SESSION 쿠키로 교환된다.
  createPreviewTicket: (actor, approvalId) =>
    apiRequest(`/approvals/${approvalId}/preview-tickets`, {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-approval-preview-ticket',
    }),

  // 결재 처리(ACT) iframe 임베드용 1회용 ticket 발급. body 로 결재자(actorUserId)를 전달하면
  // BE 가 ticket 에 바인딩하고, iframe(fe/ act-embed)은 그 결재자로서 transition 을 실행한다.
  createActTicket: (actor, approvalId, actorUserId) =>
    apiRequest(`/approvals/${approvalId}/act-tickets`, {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-approval-act-ticket',
      body: { actorUserId },
    }),

  transition: (actor, approvalId, slug, { comment } = {}) =>
    apiRequest(`/approvals/${approvalId}/transitions/${slug}`, {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-transition',
      body: comment ? { comment } : undefined,
    }),

  cancel: (actor, approvalId) =>
    apiRequest(`/approvals/${approvalId}/cancel`, {
      method: 'POST',
      actor,
      idempotencyPrefix: 'demo-cancel',
    }),
};

// 시스템 전역 처리조건(transition) 메타 목록. 앱 부팅 시 1회 호출하여
// slug → { name, iconName, colorTheme } 메타맵을 구성한다.
export const transitionTypesApi = {
  list: (actor) => apiRequest('/workflow/transition-types', { actor }),
};

// 정책 위반(/problems/policy/<slug>) 안내 라벨. 매핑 없는 slug 는 기존 fallback(title·detail·type) 유지.
const POLICY_LABELS = {
  'requester-only-approver': '기안자를 제외하면 남는 결재자가 없습니다. 결재선 설정을 확인하세요.',
};

export function describeError(err) {
  if (!err) return '알 수 없는 오류';
  if (err.body && typeof err.body === 'object') {
    const { title, detail, type } = err.body;
    if (typeof type === 'string' && type.startsWith('/problems/policy/')) {
      const label = POLICY_LABELS[type.slice('/problems/policy/'.length)];
      if (label) return detail ? `${label} (${detail})` : label;
    }
    return [title, detail, type].filter(Boolean).join(' · ') || `HTTP ${err.status || ''}`;
  }
  return err.message || String(err);
}
