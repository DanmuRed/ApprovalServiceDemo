// 사용자별 결재선 할당 store (데모 전용, localStorage).
//
// 결재선 라우팅("이 사용자는 어떤 결재선을 타는가")은 결재 서비스가 아니라
// 연동 시스템이 소유한다. demo_mock 이 연동 시스템 역할이므로 매핑을 여기서 보관한다.
// approval_service 에는 사용자→결재선 매핑 API 가 없고 from-playbook 은 playbookId 만 받는다.
//
// 구조: { [userId]: [playbookId, ...] }
//
// 한계: localStorage 라 같은 브라우저 안에서만 관리자 할당과 사용자 화면이 공유된다.

const LS_KEY = 'demo_mock.lineAssignments';

function readAll() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

// 전체 매핑 { [userId]: [playbookId] }
export function getAllAssignments() {
  return readAll();
}

// 특정 사용자에게 할당된 playbookId 배열
export function getAssignedPlaybookIds(userId) {
  const ids = readAll()[userId];
  return Array.isArray(ids) ? ids : [];
}

// 특정 사용자의 할당 목록을 통째로 설정 (빈 배열이면 매핑 제거)
export function setUserAssignments(userId, playbookIds) {
  const all = readAll();
  const next = Array.from(new Set(playbookIds.filter(Boolean)));
  if (next.length > 0) {
    all[userId] = next;
  } else {
    delete all[userId];
  }
  writeAll(all);
  return next;
}

// 여러 사용자에게 같은 결재선 목록을 일괄 할당. 빈 배열이면 각 사용자 매핑 제거.
export function setUsersAssignments(userIds, playbookIds) {
  const all = readAll();
  const next = Array.from(new Set(playbookIds.filter(Boolean)));
  userIds.filter(Boolean).forEach((uid) => {
    if (next.length > 0) all[uid] = [...next];
    else delete all[uid];
  });
  writeAll(all);
}

// 할당 전체 제거.
export function clearAllAssignments() {
  writeAll({});
}

// 특정 사용자의 단일 playbook 할당 토글. 변경된 배열 반환.
export function toggleAssignment(userId, playbookId) {
  const current = getAssignedPlaybookIds(userId);
  const next = current.includes(playbookId)
    ? current.filter((id) => id !== playbookId)
    : [...current, playbookId];
  return setUserAssignments(userId, next);
}
