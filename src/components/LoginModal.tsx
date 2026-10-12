import React, { useState } from 'react';
import { LogIn, Key, UserCheck, ShieldCheck, X, AlertCircle, Building2, Crown, Warehouse } from 'lucide-react';
import { CollaboratorUser, DockConfig } from '../types';
import { loginCollaborator } from '../services/api';

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
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('1234');
  const [selectedDock, setSelectedDock] = useState<string>('Doca 01');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginCollaborator(username.trim(), pin.trim(), selectedDock);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: CollaboratorUser) => {
    setUsername(user.username);
    setPin(user.pin);
    const dockToAssign = user.isAdmin ? 'Administração / Geral' : selectedDock;
    loginCollaborator(user.username, user.pin, dockToAssign)
      .then(res => {
        onLoginSuccess(res.user);
        onClose();
      })
      .catch(err => {
        setError(err.message || 'Erro ao acessar.');
      });
  };

  const masterUser = collaborators.find(c => c.isMaster || c.role === 'master');
  const adminList = collaborators.filter(c => (c.role === 'admin' || c.isAdmin) && !c.isMaster);
  const operatorList = collaborators.filter(c => !c.isAdmin && !c.isMaster);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-100 tracking-tight">
                Acesso do Colaborador
              </h3>
              <p className="text-xs text-zinc-400">
                Informe suas credenciais e selecione sua doca de atuação
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

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          {/* DOCK SELECTION (REQUIRED AS PER PROMPT) */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <label className="block font-medium text-zinc-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Em qual Doca você está operando hoje? *</span>
            </label>
            <select
              required
              value={selectedDock}
              onChange={e => setSelectedDock(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400 font-mono"
            >
              <optgroup label="Docas Operacionais">
                {docks.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name} {d.status === 'free' ? '(Disponível)' : `(${d.status})`}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Área Administrativa">
                <option value="Administração / Geral">Administração / Gestão Geral de Pátio</option>
                <option value="Portaria Principal">Portaria / Acesso Principal</option>
              </optgroup>
            </select>
            <p className="text-[11px] text-zinc-400">
              Necessário para o controle de coleta, conferência de pacotes e número da isca.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-300 mb-1">
                Usuário (Login)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ex: carlos.admin"
                className="w-full bg-zinc-900/80 border border-zinc-700/70 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-300 mb-1">
                PIN de Acesso (Padrão: 1234)
              </label>
              <input
                type="password"
                required
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="1234"
                className="w-full bg-zinc-900/80 border border-zinc-700/70 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wide transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* QUICK ACCESS ACCOUNTS */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-medium uppercase tracking-wider text-zinc-400">
              Acesso Rápido de Teste:
            </span>
            <span className="text-zinc-400">PIN padrão: 1234</span>
          </div>

          {/* MASTER GOOGLE ACCOUNT */}
          {masterUser && (
            <div>
              <div className="text-[11px] font-medium text-amber-300 mb-1.5 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Usuário Master (Conta Google Vinculada):</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickLogin(masterUser)}
                className="w-full p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-amber-500/30 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-medium text-xs text-zinc-200 group-hover:text-amber-200">
                    {masterUser.name}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {masterUser.email || 'gilianocosta804@gmail.com'} &bull; Criação de Planilhas
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Master
                </span>
              </button>
            </div>
          )}

          {/* 4 ADMINISTRATIVE ACCOUNTS */}
          <div>
            <div className="text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Administrativos ({adminList.length} Usuários):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {adminList.slice(0, 4).map(admin => (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => handleQuickLogin(admin)}
                  className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-left transition-colors group"
                >
                  <div className="font-medium text-xs text-zinc-200 group-hover:text-zinc-100 truncate">
                    {admin.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate">
                    {admin.username}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* DOCK OPERATORS */}
          <div>
            <div className="text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Colaboradores de Doca / Coleta (Até 50+):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {operatorList.slice(0, 2).map(op => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleQuickLogin(op)}
                  className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-left transition-colors group"
                >
                  <div className="font-medium text-xs text-zinc-200 group-hover:text-zinc-100 truncate">
                    {op.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {op.assignedDock || 'Doca Operacional'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
