import React, { useEffect, useState } from 'react';
import { X, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import {
  getApiBase,
  getApiToken,
  getFeBase,
  setApiBase,
  setApiToken,
  setFeBase,
  getEnvDefaults,
} from '../runtimeSettings';

export default function SettingsModal({ open, onClose, onSaved }) {
  const [base, setBase] = useState('');
  const [token, setToken] = useState('');
  const [feBase, setFeBaseState] = useState('');
  const [showToken, setShowToken] = useState(false);
  const env = getEnvDefaults();

  useEffect(() => {
    if (open) {
      setBase(getApiBase());
      setToken(getApiToken());
      setFeBaseState(getFeBase());
      setShowToken(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    // 환경변수 기본값과 동일하면 localStorage 를 비워둔다 (env fallback 으로 돌아감).
    setApiBase(base === env.base ? '' : base.trim());
    setApiToken(token === env.token ? '' : token.trim());
    setFeBase(feBase === env.feBase ? '' : feBase.trim());
    onSaved?.();
    onClose?.();
  };

  const handleReset = () => {
    setApiBase('');
    setApiToken('');
    setFeBase('');
    setBase(env.base);
    setToken(env.token);
    setFeBaseState(env.feBase);
    onSaved?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">접속 설정</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field
            label="API Base URL"
            value={base}
            onChange={setBase}
            placeholder="http://localhost:8080"
            help={`환경변수 기본값: ${env.base}`}
          />

          <Field
            label="FE(빌더) Base URL"
            value={feBase}
            onChange={setFeBaseState}
            placeholder="http://localhost:3000"
            help={`결재선 미리보기 iframe 의 출처 URL. 환경변수 기본값: ${env.feBase}`}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              JWT 토큰 (Bearer)
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                title={showToken ? '가리기' : '보이기'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              관리자 콘솔 → 설정 → 인증 → API 토큰 에서 발급한 평문 JWT.
              비워두면 어드민 세션이 없는 한 401 이 발생한다. 로컬 localStorage 에 평문 저장되니
              공유 PC 사용 후 [기본값으로 초기화] 로 지운다.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              기본값으로 초기화
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, help }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
      />
      {help && <p className="text-[11px] text-slate-500 mt-1">{help}</p>}
    </div>
  );
}
