// 런타임 설정: JWT 토큰과 API Base URL.
// localStorage 우선, 없으면 빌드 타임 환경변수, 그래도 없으면 기본값.

const LS_TOKEN = 'demo_mock.apiToken';
const LS_BASE = 'demo_mock.apiBase';
const LS_FEBASE = 'demo_mock.feBase';

const ENV_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
const ENV_TOKEN = process.env.REACT_APP_API_TOKEN || '';
const ENV_FEBASE = process.env.REACT_APP_FE_BASE || 'http://localhost:3000';

function safeRead(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return '';
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeWrite(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function getApiBase() {
  return safeRead(LS_BASE) || ENV_BASE;
}

export function getApiToken() {
  return safeRead(LS_TOKEN) || ENV_TOKEN;
}

export function getFeBase() {
  return safeRead(LS_FEBASE) || ENV_FEBASE;
}

export function setApiBase(v) { safeWrite(LS_BASE, v); }
export function setApiToken(v) { safeWrite(LS_TOKEN, v); }
export function setFeBase(v) { safeWrite(LS_FEBASE, v); }

export function getEnvDefaults() {
  return { base: ENV_BASE, token: ENV_TOKEN, feBase: ENV_FEBASE };
}
