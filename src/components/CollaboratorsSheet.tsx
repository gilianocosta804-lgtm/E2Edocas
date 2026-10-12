import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Key,
  UserCheck,
  UserX,
  Lock,
  Mail,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Crown,
  FileSpreadsheet,
  Building2,
  Check,
  Sliders,
  X,
} from 'lucide-react';
import { CollaboratorUser, UserPermissions, UserRole } from '../types';
import {
  createCollaborator,
  deleteCollaborator,
  updateCollaborator,
} from '../services/api';

interface CollaboratorsSheetProps {
  collaborators: CollaboratorUser[];
  currentUser: CollaboratorUser | null;
  onRefresh: () => void;
  onSelectUser: (user: CollaboratorUser) => void;
}

export const CollaboratorsSheet: React.FC<CollaboratorsSheetProps> = ({
  collaborators,
  currentUser,
  onRefresh,
  onSelectUser,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CollaboratorUser | null>(null);
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [roleFilter, setRoleFilter] = useState<'all' | 'master' | 'admin' | 'colaborador'>('all');

  // Form states for creating/editing user
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('colaborador');
  const [pin, setPin] = useState('1234');
  const [email, setEmail] = useState('');
  const [assignedDock, setAssignedDock] = useState('Doca 01');
  const [permissions, setPermissions] = useState<UserPermissions>({
    canViewSpreadsheet: false,
    canManageUsers: false,
    canCallDrivers: true,
    canCollectPackages: true,
    canConfigureDocks: false,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Group counts
  const masterCount = collaborators.filter(c => c.isMaster || c.role === 'master').length;
  const adminCount = collaborators.filter(c => (c.role === 'admin' || c.isAdmin) && !c.isMaster).length;
  const operatorCount = collaborators.filter(c => !c.isAdmin && !c.isMaster).length;

  const handleTogglePin = (id: string) => {
    setShowPin(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = () => {
    setName('');
    setUsername('');
    setRole('colaborador');
    setPin('1234');
    setEmail('');
    setAssignedDock('Doca 01');
    setPermissions({
      canViewSpreadsheet: false,
      canManageUsers: false,
      canCallDrivers: true,
      canCollectPackages: true,
      canConfigureDocks: false,
      canMovePackages: false,
      canUseChat: false,
      canConsultCep: false,
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowAddModal(true);
  };

  const openEditModal = (user: CollaboratorUser) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setRole(user.role);
    setPin(user.pin);
    setEmail(user.email || '');
    setAssignedDock(user.assignedDock || 'Doca 01');
    setPermissions(user.permissions || {
      canViewSpreadsheet: user.isAdmin,
      canManageUsers: user.isAdmin,
      canCallDrivers: true,
      canCollectPackages: true,
      canConfigureDocks: user.isAdmin,
      canMovePackages: user.isAdmin || Boolean(user.isMaster),
      canUseChat: user.isAdmin || Boolean(user.isMaster),
      canConsultCep: user.isAdmin || Boolean(user.isMaster),
    });
    setErrorMsg(null);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'admin' || newRole === 'master') {
      setPermissions({
        canViewSpreadsheet: true,
        canManageUsers: true,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: true,
        canMovePackages: true,
        canUseChat: true,
        canConsultCep: true,
      });
    } else {
      setPermissions({
        canViewSpreadsheet: false,
        canManageUsers: false,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: false,
        canMovePackages: false,
        canUseChat: false,
        canConsultCep: false,
      });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (editingUser) {
        await updateCollaborator(editingUser.id, {
          name: name.trim(),
          username: username.trim().toLowerCase(),
          role,
          pin: pin.trim(),
          email: email.trim(),
          assignedDock,
          permissions,
        });
        setSuccessMsg('Usuário atualizado com sucesso!');
        setEditingUser(null);
      } else {
        await createCollaborator({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          role,
          pin: pin.trim(),
          email: email.trim(),
          assignedDock,
          permissions,
        });
        setSuccessMsg('Novo usuário cadastrado com sucesso!');
        setShowAddModal(false);
      }
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar usuário.');
    }
  };

  const handleToggleStatus = async (user: CollaboratorUser) => {
    if (user.isMaster) {
      alert('Não é possível desativar o Usuário Master.');
      return;
    }
    try {
      await updateCollaborator(user.id, { active: !user.active });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (user: CollaboratorUser) => {
    if (user.isMaster) {
      alert('Não é possível remover o Usuário Master.');
      return;
    }
    const confirmed = window.confirm(`Deseja realmente remover o colaborador ${user.name}?`);
    if (!confirmed) return;

    try {
      await deleteCollaborator(user.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredCollaborators = collaborators.filter(c => {
    if (roleFilter === 'master') return c.isMaster || c.role === 'master';
    if (roleFilter === 'admin') return (c.role === 'admin' || c.isAdmin) && !c.isMaster;
    if (roleFilter === 'colaborador') return !c.isAdmin && !c.isMaster;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Gestão de Usuários &amp; Permissões
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {collaborators.length} Contas Ativas
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              1 Usuário Master (Conta Google), 4 Administrativos e até 50+ Colaboradores de doca simultâneos
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold tracking-wide transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Usuário</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TEAM OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* MASTER */}
        <div className="bg-zinc-950 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Usuário Master (1 Conta)
            </span>
            <span className="text-xs font-bold font-mono text-amber-300">{masterCount} Ativo</span>
          </div>
          <div className="text-sm font-semibold text-zinc-100 mt-2">
            gilianocosta804@gmail.com
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Conectado para criação automática das planilhas e formulários Google.
          </p>
        </div>

        {/* 4 ADMINS */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              Administrativos (4 Iniciais)
            </span>
            <span className="text-xs font-bold font-mono text-zinc-200">{adminCount} Contas</span>
          </div>
          <div className="text-sm font-semibold text-zinc-100 mt-2">
            Gestão &amp; Controle Total
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Acesso e controle total de <strong>todas as docas simultaneamente</strong> e planilha em tempo real.
          </p>
        </div>

        {/* 50 COLLABORATORS */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              Colaboradores de Doca
            </span>
            <span className="text-xs font-bold font-mono text-zinc-200">{operatorCount} Operadores</span>
          </div>
          <div className="text-sm font-semibold text-zinc-100 mt-2">
            Operação nas Docas (50+)
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Acesso restrito <strong>exclusivamente à sua própria doca</strong> para chamar veículos e registrar pacotes.
          </p>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500 font-mono text-[11px]">Filtrar por:</span>
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            roleFilter === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Todos ({collaborators.length})
        </button>
        <button
          onClick={() => setRoleFilter('master')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            roleFilter === 'master' ? 'bg-zinc-800 text-amber-300 font-medium' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Master ({masterCount})
        </button>
        <button
          onClick={() => setRoleFilter('admin')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            roleFilter === 'admin' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Administrativos ({adminCount})
        </button>
        <button
          onClick={() => setRoleFilter('colaborador')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            roleFilter === 'colaborador' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Colaboradores ({operatorCount})
        </button>
      </div>

      {/* COLLABORATORS TABLE */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Nome / Usuário</th>
                <th className="p-3.5">Perfil</th>
                <th className="p-3.5">Doca Alocada</th>
                <th className="p-3.5">PIN</th>
                <th className="p-3.5">Permissões Habilitadas</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 text-zinc-200">
              {filteredCollaborators.map(user => {
                const isMaster = user.isMaster || user.role === 'master';
                const isAdmin = (user.role === 'admin' || user.isAdmin) && !isMaster;
                const isCurrent = currentUser?.id === user.id;

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-zinc-900/50 transition-colors ${
                      isCurrent ? 'bg-zinc-900/30' : ''
                    }`}
                  >
                    {/* NAME & USERNAME */}
                    <td className="p-3.5">
                      <div className="font-semibold text-white text-xs flex items-center gap-2">
                        {user.name}
                        {isMaster && (
                          <span className="p-0.5 rounded bg-amber-500/10 text-amber-400" title="Usuário Master">
                            <Crown className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isAdmin && (
                          <span className="p-0.5 rounded bg-zinc-800 text-zinc-300" title="Administrador Geral">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-950 font-bold">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        @{user.username} {user.email && `&bull; ${user.email}`}
                      </div>
                    </td>

                    {/* ROLE */}
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                          isMaster
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : isAdmin
                            ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-850'
                        }`}
                      >
                        {isMaster ? 'Master (Google)' : isAdmin ? 'Administrador' : 'Colaborador'}
                      </span>
                    </td>

                    {/* ASSIGNED DOCK */}
                    <td className="p-3.5 font-mono text-zinc-300">
                      {user.assignedDock || (isAdmin ? 'Geral' : 'Não definida')}
                    </td>

                    {/* PIN */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-zinc-300 text-xs">
                          {showPin[user.id] ? user.pin : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(user.id)}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-300"
                        >
                          {showPin[user.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* PERMISSIONS TAGS */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.permissions?.canMovePackages && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            Pacotes
                          </span>
                        )}
                        {user.permissions?.canUseChat && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Chat ADM
                          </span>
                        )}
                        {user.permissions?.canConsultCep && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            CEP
                          </span>
                        )}
                        {user.permissions?.canViewSpreadsheet && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            Planilha
                          </span>
                        )}
                        {user.permissions?.canCallDrivers && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            Chamadas
                          </span>
                        )}
                        {user.permissions?.canCollectPackages && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            Coleta/Isca
                          </span>
                        )}
                        {user.permissions?.canManageUsers && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            Gestão Usuários
                          </span>
                        )}
                        {!user.permissions?.canMovePackages &&
                          !user.permissions?.canUseChat &&
                          !user.permissions?.canConsultCep &&
                          !user.permissions?.canViewSpreadsheet &&
                          !user.permissions?.canManageUsers && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/60 text-zinc-500 border border-zinc-850">
                              Doca Padrão
                            </span>
                          )}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                          user.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectUser(user)}
                          title="Alternar sessão para este usuário"
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-800 transition-colors"
                        >
                          Usar
                        </button>

                        <button
                          onClick={() => openEditModal(user)}
                          title="Editar dados e permissões"
                          className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isMaster && (
                          <button
                            onClick={() => handleDelete(user)}
                            title="Remover colaborador"
                            className="p-1.5 rounded bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-850 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL WITH GRANULAR PERMISSIONS */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">
                    {editingUser ? 'Editar Usuário & Permissões' : 'Criar Novo Usuário'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Configure perfil de acesso, doca de atuação e limites de permissão
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Roberto Gomes"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Nome de Usuário (Login) *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ex: roberto.doca"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">PIN / Senha de Acesso *</label>
                  <input
                    type="password"
                    required
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Perfil / Cargo *</label>
                  <select
                    value={role}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="colaborador">Colaborador de Doca / Coleta</option>
                    <option value="admin">Administrativo Geral</option>
                    <option value="master">Usuário Master (Conta Google)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Doca Alocada Padrão</label>
                  <input
                    type="text"
                    value={assignedDock}
                    onChange={e => setAssignedDock(e.target.value)}
                    placeholder="Ex: Doca 02 ou Geral"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ex: roberto@empresa.com"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              {/* GRANULAR PERMISSIONS SECTION (LIMIT USER PERMISSIONS) */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                <span className="font-semibold text-xs text-zinc-200 block uppercase font-mono tracking-wider text-[10px]">
                  Limitar Permissões do Usuário:
                </span>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold cursor-pointer p-1.5 rounded-lg bg-amber-950/20 border border-amber-500/20">
                    <input
                      type="checkbox"
                      checked={permissions.canMovePackages || false}
                      onChange={e =>
                        setPermissions({ ...permissions, canMovePackages: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-amber-500/50 text-amber-500 focus:ring-0"
                    />
                    <span>Movimentar Pacote (Transferir/Adicionar pacotes entre rotas)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-blue-300 font-medium cursor-pointer p-1.5 rounded-lg bg-blue-950/20 border border-blue-500/20">
                    <input
                      type="checkbox"
                      checked={permissions.canUseChat || false}
                      onChange={e =>
                        setPermissions({ ...permissions, canUseChat: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-blue-500/50 text-blue-500 focus:ring-0"
                    />
                    <span>Usar Chat em Tempo Real com a Administração</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-emerald-300 font-medium cursor-pointer p-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                    <input
                      type="checkbox"
                      checked={permissions.canConsultCep || false}
                      onChange={e =>
                        setPermissions({ ...permissions, canConsultCep: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-emerald-500/50 text-emerald-500 focus:ring-0"
                    />
                    <span>Consultar CEP Oficial (ViaCEP / Correios)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canViewSpreadsheet}
                      onChange={e =>
                        setPermissions({ ...permissions, canViewSpreadsheet: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0"
                    />
                    <span>Visualizar Planilha de Controle em Tempo Real (Restrito a Admins)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canCallDrivers}
                      onChange={e =>
                        setPermissions({ ...permissions, canCallDrivers: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0"
                    />
                    <span>Chamar Motoristas para as Docas</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canCollectPackages}
                      onChange={e =>
                        setPermissions({ ...permissions, canCollectPackages: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0"
                    />
                    <span>Registrar Coleta (Quantidade de Pacotes e Número da Isca)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canManageUsers}
                      onChange={e =>
                        setPermissions({ ...permissions, canManageUsers: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0"
                    />
                    <span>Gerenciar Usuários e Alterar Permissões</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canConfigureDocks}
                      onChange={e =>
                        setPermissions({ ...permissions, canConfigureDocks: e.target.checked })
                      }
                      className="rounded bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0"
                    />
                    <span>Adicionar ou Excluir Docas Operacionais</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                  }}
                  className="w-1/2 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium text-xs border border-zinc-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wide transition-colors"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
