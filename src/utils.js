// 데모용 헬퍼.

const RANDOM_SUBJECTS = [
  '월간 비용 정산',
  '신규 장비 구매',
  '연차 신청',
  '외부 출장 보고',
  '교육 참가 요청',
  '복지 포인트 신청',
  '재택근무 신청',
  '거래처 회식비 정산',
  '도서 구입 신청',
  '사내 행사 비용',
];

export function makeRandomTitle() {
  const subject = RANDOM_SUBJECTS[Math.floor(Math.random() * RANDOM_SUBJECTS.length)];
  const today = new Date();
  const ymd = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
  const tag = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `[${ymd}] ${subject} (${tag})`;
}

export function makeLocalId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function approvalStateLabel(state) {
  switch (state) {
    case 'READY': return '대기';
    case 'IN_PROGRESS': return '진행 중';
    case 'COMPLETED': return '종결';
    case 'CANCELED': return '취소';
    default: return state || '-';
  }
}

export function approvalResultLabel(result) {
  switch (result) {
    case 'APPROVED': return '승인';
    case 'REJECTED': return '반려';
    case 'WITHDRAWN': return '회수';
    case 'CANCELED': return '취소';
    default: return result || '-';
  }
}

export function stepStateLabel(state) {
  switch (state) {
    case 'WAITING': return '대기';
    case 'PENDING': return '결재 대기';
    case 'PROCESSED': return '처리됨';
    case 'SKIPPED': return '스킵';
    default: return state || '-';
  }
}

// 결재 상세에서 "현재 로그인 사용자가 결재해야 하는 step" 이 있는지 판정.
// steps[] 중 state=PENDING 이고 approver(또는 delegatedTo) == userId 인 것이 있으면 true.
export function findPendingStepForUser(approval, userId) {
  if (!approval || !userId) return null;
  const steps = Array.isArray(approval.steps) ? approval.steps : [];
  return steps.find((step) => {
    if (!step || step.state !== 'PENDING') return false;
    if (step.delegatedTo && step.delegatedTo === userId) return true;
    if (step.approver === userId) return true;
    // 그룹 결재자: assigneeOptions.members 안에 userId 가 있으면 true
    if (step.approverType === 'GROUP' && step.assigneeOptions) {
      try {
        const parsed = typeof step.assigneeOptions === 'string'
          ? JSON.parse(step.assigneeOptions)
          : step.assigneeOptions;
        const members = Array.isArray(parsed?.members) ? parsed.members : [];
        return members.includes(userId);
      } catch {
        return false;
      }
    }
    return false;
  }) || null;
}

// 결재 step 진행 비율 (0-100).
export function progressPercent(approval) {
  const steps = Array.isArray(approval?.steps) ? approval.steps : [];
  if (steps.length === 0) return 0;
  const done = steps.filter((s) => s.state === 'PROCESSED' || s.state === 'SKIPPED').length;
  return Math.round((done / steps.length) * 100);
}
