import React, { useState } from 'react';
import {
  LogIn,
  Key,
  UserCheck,
  ShieldCheck,
  X,
  AlertCircle,
  Building2,
  Crown,
  Warehouse,
  CheckCircle2,
  Sparkles,
  Mail,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { CollaboratorUser, DockConfig } from '../types';
import { loginCollaborator, loginWithGoogleMaster } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: CollaboratorUser[];
  docks: DockConfig[];
  onLoginSuccess: (user: CollaboratorUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  collaborators,
  docks,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'pin'>('google');
  const [googleEmail, setGoogleEmail] = useState('gilianocosta804@gmail.com');
  const [username, setUsername] = useState('gilianocosta804@gmail.com');
  const [pin, setPin] = useState('415263');
  const [selectedDock, setSelectedDock] = useState<string>('Administração / Geral');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handle Login via Gmail / Google Account (Master User)
  const handleGoogleMasterLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const emailToUse = googleEmail.trim() || 'gilianocosta804@gmail.com';
      const res = await loginWithGoogleMaster(emailToUse, selectedDock);
      try {
        localStorage.setItem('e2e_current_user', JSON.stringify(res.user));
      } catch {}
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login com Gmail.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Username / PIN Login
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginCollaborator(username.trim(), pin.trim(), selectedDock);
      try {
        localStorage.setItem('e2e_current_user', JSON.stringify(res.user));
      } catch {}
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas ou usuário inativo.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: CollaboratorUser) => {
    setUsername(user.username);
    setPin(user.pin);
    const dockToAssign = user.isAdmin || user.isMaster ? 'Administração / Geral' : selectedDock;
    loginCollaborator(user.username, user.pin, dockToAssign)
      .then(res => {
        try {
          localStorage.setItem('e2e_current_user', JSON.stringify(res.user));
        } catch {}
        onLoginSuccess(res.user);
        onClose();
      })
      .catch(err => {
        setError(err.message || 'Erro ao acessar.');
      });
  };

  const masterUser = collaborators.find(c => c.isMaster || c.role === 'master' || c.email === 'gilianocosta804@gmail.com');
  const adminList = collaborators.filter(c => (c.role === 'admin' || c.isAdmin) && !c.isMaster && c.email !== 'gilianocosta804@gmail.com');
  const operatorList = collaborators.filter(c => !c.isAdmin && !c.isMaster);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl text-zinc-100 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-100 tracking-tight">
                  Acesso ao Sistema E2E - DOCAS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Master &amp; Docas
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Logue com seu Gmail para ter status Master com todos os acessos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: Gmail (Master) vs PIN Colaborador */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'google'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Login com Gmail (Master)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'pin'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Login com PIN / Doca</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: GMAIL / GOOGLE MASTER LOGIN */}
        {activeTab === 'google' && (
          <div className="space-y-4 animate-in fade-in">
            {/* MASTER PRIVILEGES HIGHLIGHT CARD */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-amber-950/20 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-xs">
                    {/* Google Multicolor "G" Logo */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.66-4.92H1.27v3.13C3.25 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.34 14.28c-.24-.72-.37-1.49-.37-2.28s.13-1.56.37-2.28V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.07-3.13z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.59l4.07 3.13c.93-2.82 3.56-4.97 6.66-4.97z"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white">Conta Google Master</span>
                    <p className="text-[10px] text-amber-300 font-mono">Status Master Autorizado</p>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded bg-amber-500 text-zinc-950 shadow-xs">
                  Acesso Total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-300 pt-1 border-t border-amber-500/20">
                <span className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Todas as Docas (01 a 10+)
                </span>
                <span className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Todas as Movimentações
                </span>
                <span className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Chamadas de Motoristas
                </span>
                <span className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Planilha &amp; Gestão ADM
                </span>
              </div>
            </div>

            {/* DIRECT 1-CLICK QUICK ACCESS AS GILIANO COSTA */}
            <button
              type="button"
              onClick={() => {
                setGoogleEmail('gilianocosta804@gmail.com');
                handleGoogleMasterLogin();
              }}
              disabled={loading}
              className="w-full p-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-xl shadow-amber-500/20 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-zinc-950 fill-current" />
                <div className="text-left">
                  <div className="font-black text-xs leading-none">Entrar como Giliano Costa (Master)</div>
                  <div className="text-[10px] opacity-80 font-mono mt-0.5">gilianocosta804@gmail.com &bull; 1 Clique</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-950" />
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-zinc-500">ou digitar outro Gmail</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {/* GMAIL INPUT FORM */}
            <form onSubmit={handleGoogleMasterLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    Seu endereço de Gmail:
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Conta Vinculada</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={e => setGoogleEmail(e.target.value)}
                    placeholder="gilianocosta804@gmail.com"
                    className="w-full bg-zinc-900 border border-amber-500/50 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {googleEmail && (
                    <span className="absolute right-3.5 top-3.5 text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Master
                    </span>
                  )}
                </div>
              </div>

              {/* DOCK / WORK AREA SELECTION */}
              <div>
                <label className="block font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Área de Operação / Doca:</span>
                </label>
                <select
                  value={selectedDock}
                  onChange={e => setSelectedDock(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2.5 text-xs text-zinc-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Administração / Geral">👑 Administração / Gestão Geral (Todas as Docas)</option>
                  <option value="Portaria Principal">🚚 Portaria Principal / Entrada de Motoristas</option>
                  {docks.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.status === 'free' ? '(Disponível)' : `(${d.status})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-zinc-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/20 transition-all cursor-pointer active:scale-98"
              >
                <Crown className="w-4 h-4 text-zinc-950" />
                <span>
                  {loading
                    ? 'Autenticando Master...'
                    : `Entrar com Gmail (${googleEmail.split('@')[0]}) • Acesso Master`}
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-950" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: STANDARD USERNAME & PIN LOGIN */}
        {activeTab === 'pin' && (
          <form onSubmit={handlePinLogin} className="space-y-4 text-xs animate-in fade-in">
            {/* DOCK SELECTION */}
            <div>
              <label className="block font-medium text-zinc-200 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Em qual Doca você está operando hoje? *</span>
              </label>
              <select
                required
                value={selectedDock}
                onChange={e => setSelectedDock(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400 font-mono"
              >
                <optgroup label="Área Administrativa">
                  <option value="Administração / Geral">👑 Administração / Gestão Geral de Pátio</option>
                  <option value="Portaria Principal">Portaria / Acesso Principal</option>
                </optgroup>
                <optgroup label="Docas Operacionais">
                  {docks.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.status === 'free' ? '(Disponível)' : `(${d.status})`}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* USER SELECTOR SHORTCUT FROM SPREADSHEET */}
            {collaborators.length > 1 && (
              <div>
                <label className="block font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Selecionar Usuário Criado na Planilha:</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Auto-preenchimento</span>
                </label>
                <select
                  onChange={e => {
                    const found = collaborators.find(c => c.username === e.target.value || c.id === e.target.value);
                    if (found) {
                      setUsername(found.username);
                      setPin(found.pin);
                      if (found.assignedDock) setSelectedDock(found.assignedDock);
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>-- Escolha um usuário da planilha --</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.username}>
                      {c.name} (@{c.username}) &bull; PIN: {c.pin} &bull; {c.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* USERNAME OR EMAIL */}
            <div>
              <label className="block font-medium text-zinc-200 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Usuário ou Gmail *</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="gilianocosta804@gmail.com ou giliano"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-mono"
              />
            </div>

            {/* PIN / SENHA */}
            <div>
              <label className="block font-medium text-zinc-200 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                <span>Senha Master ou PIN de Doca *</span>
              </label>
              <input
                type="password"
                required
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Gili2112#@ ou PIN"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-mono tracking-wider"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Acessando...' : 'Entrar com Senha / PIN'}</span>
            </button>
          </form>
        )}

        {/* QUICK LOGIN SHORTCUTS */}
        <div className="pt-3 border-t border-zinc-850 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold">
            <span>Atalhos de Acesso Rápido:</span>
            <span className="font-mono text-[10px] text-amber-300 font-bold">Senha Master: Gili2112#@</span>
          </div>

          {/* MASTER USER BUTTON */}
          <button
            type="button"
            onClick={() => handleGoogleMasterLogin()}
            className="w-full p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="font-bold text-xs text-amber-200 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Giliano Costa (Usuário Master)</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                gilianocosta804@gmail.com &bull; Controle Total e Movimentações
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-zinc-950">
              Master
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
