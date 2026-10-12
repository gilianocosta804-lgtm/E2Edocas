import React, { useState, useEffect } from 'react';
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
  Download,
  ClipboardPaste,
  Save,
  RefreshCw,
  LogIn,
  Table,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CollaboratorUser, UserPermissions, UserRole } from '../types';
import {
  createCollaborator,
  deleteCollaborator,
  updateCollaborator,
  batchSaveCollaborators,
} from '../services/api';

interface CollaboratorsSheetProps {
  collaborators: CollaboratorUser[];
  currentUser: CollaboratorUser | null;
  onRefresh: () => void;
  onSelectUser: (user: CollaboratorUser) => void;
  docks?: Array<{ id: string; name: string }>;
}

export interface SpreadsheetLoginRow {
  id: string;
  name: string;
  username: string;
  pin: string;
  email: string;
  role: UserRole;
  assignedDock: string;
  active: boolean;
  canMovePackages: boolean;
  canUseChat: boolean;
  canConsultCep: boolean;
  canViewSpreadsheet: boolean;
  canManageUsers: boolean;
  canCallDrivers: boolean;
  canCollectPackages: boolean;
  canConfigureDocks: boolean;
  isNew?: boolean;
}

export const CollaboratorsSheet: React.FC<CollaboratorsSheetProps> = ({
  collaborators,
  currentUser,
  onRefresh,
  onSelectUser,
  docks = [],
}) => {
  // Mode: Spreadsheet (Planilha de Logins) vs Cards (Modo Cartões)
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'cards'>('spreadsheet');

  // Spreadsheet Rows state
  const [rows, setRows] = useState<SpreadsheetLoginRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Legacy single add/edit modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CollaboratorUser | null>(null);
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [roleFilter, setRoleFilter] = useState<'all' | 'master' | 'admin' | 'colaborador'>('all');

  // Form states for creating/editing user modal
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
    canMovePackages: false,
    canUseChat: false,
    canConsultCep: false,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync rows when collaborators prop updates
  useEffect(() => {
    const mapped: SpreadsheetLoginRow[] = collaborators.map(c => ({
      id: c.id,
      name: c.name || '',
      username: c.username || '',
      pin: c.pin || '1234',
      email: c.email || '',
      role: c.role || 'colaborador',
      assignedDock: c.assignedDock || (c.isAdmin || c.isMaster ? 'Administração / Geral' : 'Doca 01'),
      active: c.active !== false,
      canMovePackages: Boolean(c.isMaster || c.isAdmin || c.permissions?.canMovePackages),
      canUseChat: Boolean(c.isMaster || c.isAdmin || c.permissions?.canUseChat),
      canConsultCep: Boolean(c.isMaster || c.isAdmin || c.permissions?.canConsultCep),
      canViewSpreadsheet: Boolean(c.isMaster || c.isAdmin || c.permissions?.canViewSpreadsheet),
      canManageUsers: Boolean(c.isMaster || c.isAdmin || c.permissions?.canManageUsers),
      canCallDrivers: Boolean(c.isMaster || c.isAdmin || (c.permissions?.canCallDrivers ?? true)),
      canCollectPackages: Boolean(c.isMaster || c.isAdmin || (c.permissions?.canCollectPackages ?? true)),
      canConfigureDocks: Boolean(c.isMaster || c.isAdmin || c.permissions?.canConfigureDocks),
      isNew: false,
    }));
    setRows(mapped);
  }, [collaborators]);

  // Standard dock options
  const dockOptions = [
    'Administração / Geral',
    'Portaria Principal',
    ...Array.from({ length: 15 }, (_, i) => `Doca ${String(i + 1).padStart(2, '0')}`),
  ];

  // Group counts
  const masterCount = collaborators.filter(c => c.isMaster || c.role === 'master').length;
  const adminCount = collaborators.filter(c => (c.role === 'admin' || c.isAdmin) && !c.isMaster).length;
  const operatorCount = collaborators.filter(c => !c.isAdmin && !c.isMaster).length;

  const handleTogglePin = (id: string) => {
    setShowPin(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- SPREADSHEET OPERATIONS ---

  // 1. Add new blank row to spreadsheet
  const handleAddSpreadsheetRow = () => {
    const tempId = `new-${Date.now()}`;
    const nextNum = rows.filter(r => r.role === 'colaborador').length + 1;
    const defaultDock = `Doca ${String(Math.min(15, nextNum)).padStart(2, '0')}`;

    const newRow: SpreadsheetLoginRow = {
      id: tempId,
      name: '',
      username: '',
      pin: '1234',
      email: '',
      role: 'colaborador',
      assignedDock: defaultDock,
      active: true,
      canMovePackages: true,
      canUseChat: true,
      canConsultCep: true,
      canViewSpreadsheet: false,
      canManageUsers: false,
      canCallDrivers: true,
      canCollectPackages: true,
      canConfigureDocks: false,
      isNew: true,
    };

    setRows(prev => [newRow, ...prev]);
    setSuccessMsg('Nova linha adicionada no topo da planilha! Preencha os campos e clique em "Salvar Todos os Logins".');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // 2. Update a field in a specific spreadsheet row
  const handleUpdateRow = (id: string, field: keyof SpreadsheetLoginRow, value: any) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // Auto-generate username from name if username was empty
        if (field === 'name' && (!r.username || r.username === r.name.toLowerCase().replace(/\s+/g, '.'))) {
          const clean = String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '.');
          updated.username = clean;
        }

        // Auto-adjust permissions if role changes to admin or master
        if (field === 'role') {
          if (value === 'admin' || value === 'master') {
            updated.canViewSpreadsheet = true;
            updated.canManageUsers = true;
            updated.canConfigureDocks = true;
            updated.canMovePackages = true;
            updated.canUseChat = true;
            updated.canConsultCep = true;
            updated.assignedDock = 'Administração / Geral';
          }
        }

        return updated;
      })
    );
  };

  // 3. Delete a row from spreadsheet
  const handleDeleteRow = async (row: SpreadsheetLoginRow) => {
    if (row.role === 'master' || row.email === 'gilianocosta804@gmail.com') {
      alert('Não é possível remover o Usuário Master do sistema.');
      return;
    }

    if (row.isNew) {
      setRows(prev => prev.filter(r => r.id !== row.id));
      return;
    }

    const confirmed = window.confirm(`Deseja realmente remover o login de "${row.name || row.username}"?`);
    if (!confirmed) return;

    try {
      await deleteCollaborator(row.id);
      setRows(prev => prev.filter(r => r.id !== row.id));
      onRefresh();
      setSuccessMsg(`Login de ${row.name || row.username} removido com sucesso.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erro ao remover colaborador.');
    }
  };

  // 4. Batch save all rows to backend
  const handleSaveAllRows = async () => {
    setIsSavingBatch(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Validate empty names
      const validRows = rows.filter(r => r.name.trim() || r.username.trim() || r.email.trim());
      if (validRows.length === 0) {
        throw new Error('Nenhuma linha preenchida na planilha para salvar.');
      }

      const payload = validRows.map(r => ({
        name: r.name.trim() || r.username.trim() || 'Colaborador',
        username: r.username.trim() || r.name.toLowerCase().replace(/\s+/g, '.'),
        pin: r.pin.trim() || '1234',
        email: r.email.trim(),
        role: r.role,
        assignedDock: r.assignedDock,
        permissions: {
          canViewSpreadsheet: r.canViewSpreadsheet,
          canManageUsers: r.role === 'admin' || r.role === 'master',
          canCallDrivers: r.canCallDrivers,
          canCollectPackages: r.canCollectPackages,
          canConfigureDocks: r.canConfigureDocks,
          canMovePackages: r.canMovePackages,
          canUseChat: r.canUseChat,
          canConsultCep: r.canConsultCep,
        },
      }));

      const res = await batchSaveCollaborators(payload);
      setSuccessMsg(
        `✅ Planilha de Logins salva com sucesso! (${res.createdCount} criados, ${res.updatedCount} atualizados). Todos os logins já estão prontos para acesso imediato!`
      );
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar planilha de logins.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  // 5. Parse pasted text from Excel / Google Sheets
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setShowPasteModal(false);
      return;
    }

    const lines = pastedText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const newParsedRows: SpreadsheetLoginRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Split by tab (Excel/Google Sheets default) or comma/semicolon
      let parts = line.includes('\t') ? line.split('\t') : line.split(/[,;]/);
      parts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));

      if (parts.length === 0 || !parts[0]) continue;

      // Skip header row if copied with headers
      if (
        i === 0 &&
        (parts[0].toLowerCase().includes('nome') ||
          parts[0].toLowerCase().includes('usuario') ||
          parts[0].toLowerCase().includes('login'))
      ) {
        continue;
      }

      const colName = parts[0] || '';
      let colUsername = parts[1] || '';
      if (!colUsername && colName) {
        colUsername = colName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '.');
      }

      const colPin = parts[2] || '1234';
      const colEmail = parts[3] || '';
      const rawRole = (parts[4] || 'colaborador').toLowerCase();
      const colRole: UserRole =
        rawRole.includes('master') ? 'master' : rawRole.includes('admin') ? 'admin' : 'colaborador';
      const colDock = parts[5] || (colRole === 'admin' ? 'Administração / Geral' : 'Doca 01');

      newParsedRows.push({
        id: `pasted-${Date.now()}-${i}`,
        name: colName,
        username: colUsername,
        pin: colPin,
        email: colEmail,
        role: colRole,
        assignedDock: colDock,
        active: true,
        canMovePackages: true,
        canUseChat: true,
        canConsultCep: true,
        canViewSpreadsheet: colRole === 'admin' || colRole === 'master',
        canManageUsers: colRole === 'admin' || colRole === 'master',
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: colRole === 'admin' || colRole === 'master',
        isNew: true,
      });
    }

    if (newParsedRows.length > 0) {
      setRows(prev => [...newParsedRows, ...prev]);
      setSuccessMsg(
        `📋 ${newParsedRows.length} linha(s) importada(s) do Excel/Sheets! Revise os dados e clique em "Salvar Todos os Logins na Planilha".`
      );
      setTimeout(() => setSuccessMsg(null), 6000);
    } else {
      alert('Nenhum dado válido reconhecido no texto colado.');
    }

    setPastedText('');
    setShowPasteModal(false);
  };

  // 6. Download logins sheet CSV
  const handleDownloadCsv = () => {
    window.open('/api/collaborators-sheet/csv', '_blank');
  };

  // --- MODAL SINGLE USER LOGIC (LEGACY COMPATIBILITY) ---
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
      canMovePackages: true,
      canUseChat: true,
      canConsultCep: true,
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
    setPermissions(
      user.permissions || {
        canViewSpreadsheet: user.isAdmin,
        canManageUsers: user.isAdmin,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: user.isAdmin,
        canMovePackages: user.isAdmin || Boolean(user.isMaster),
        canUseChat: user.isAdmin || Boolean(user.isMaster),
        canConsultCep: user.isAdmin || Boolean(user.isMaster),
      }
    );
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
        canMovePackages: true,
        canUseChat: true,
        canConsultCep: true,
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
      {/* HEADER BANNER WITH SPREADSHEET EMPHASIS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Planilha de Criação e Gestão de Logins
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {rows.length} Logins na Planilha
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Crie logins digitando diretamente nas linhas da planilha ou colando do Excel / Google Sheets
            </p>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'spreadsheet'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Modo Planilha</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modo Cartões</span>
            </button>
          </div>

          {/* Add Row Button */}
          <button
            onClick={handleAddSpreadsheetRow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Adicionar Linha</span>
          </button>

          {/* Paste from Excel / Sheets */}
          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors cursor-pointer"
            title="Copiar e colar múltiplas linhas do Excel ou Google Sheets"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Colar do Excel</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors cursor-pointer"
            title="Baixar planilha de logins em formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* VIEW MODE 1: SPREADSHEET (PLANILHA INTERATIVA DE LOGINS) */}
      {viewMode === 'spreadsheet' && (
        <div className="space-y-4">
          {/* SPREADSHEET TOOLBAR & QUICK TIPS */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Como funciona:</strong> Digite o <strong>Nome</strong>, <strong>Usuário</strong> e <strong>Senha/PIN</strong> nas células abaixo e clique no botão verde <strong>Salvar Todos os Logins</strong>.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSaveAllRows}
                disabled={isSavingBatch}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Save className={`w-4 h-4 ${isSavingBatch ? 'animate-spin' : ''}`} />
                <span>{isSavingBatch ? 'Salvando...' : 'Salvar Todos os Logins na Planilha'}</span>
              </button>
            </div>
          </div>

          {/* SPREADSHEET TABLE GRID */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3 min-w-[180px]">Nome Completo *</th>
                    <th className="p-3 min-w-[150px]">Usuário / Login *</th>
                    <th className="p-3 min-w-[110px]">Senha / PIN *</th>
                    <th className="p-3 min-w-[170px]">E-mail (Opcional)</th>
                    <th className="p-3 min-w-[130px]">Perfil / Cargo</th>
                    <th className="p-3 min-w-[140px]">Doca Alocada</th>
                    <th className="p-3 text-center min-w-[80px]" title="Movimentar Pacotes">Pacotes</th>
                    <th className="p-3 text-center min-w-[80px]" title="Chat em tempo real com ADM">Chat</th>
                    <th className="p-3 text-center min-w-[80px]" title="Consulta oficial de CEP">CEP</th>
                    <th className="p-3 text-center min-w-[80px]" title="Ver Planilha Diária">Planilha</th>
                    <th className="p-3 text-center min-w-[80px]">Status</th>
                    <th className="p-3 text-right min-w-[110px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-200 font-sans">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-zinc-500">
                        Nenhum login cadastrado. Clique em "+ Adicionar Linha" para começar a criar logins!
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const isMaster = row.role === 'master' || row.email === 'gilianocosta804@gmail.com';
                      const isAdmin = row.role === 'admin';
                      const isCurrent = currentUser?.id === row.id || currentUser?.username === row.username;

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-zinc-900/60 transition-colors ${
                            row.isNew
                              ? 'bg-emerald-950/20 border-l-2 border-emerald-500'
                              : isCurrent
                              ? 'bg-zinc-900/40'
                              : ''
                          }`}
                        >
                          {/* INDEX NUMBER */}
                          <td className="p-3 text-center text-[11px] font-mono text-zinc-500">
                            {index + 1}
                          </td>

                          {/* NOME COMPLETO */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={e => handleUpdateRow(row.id, 'name', e.target.value)}
                              placeholder="Nome do colaborador"
                              disabled={isMaster}
                              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                            />
                          </td>

                          {/* USUÁRIO / LOGIN */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.username}
                              onChange={e => handleUpdateRow(row.id, 'username', e.target.value.toLowerCase())}
                              placeholder="login.usuario"
                              disabled={isMaster}
                              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors"
                            />
                          </td>

                          {/* SENHA / PIN */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.pin}
                              onChange={e => handleUpdateRow(row.id, 'pin', e.target.value)}
                              placeholder="1234"
                              disabled={isMaster}
                              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 placeholder-zinc-600 focus:outline-none transition-colors"
                            />
                          </td>

                          {/* EMAIL */}
                          <td className="p-2">
                            <input
                              type="email"
                              value={row.email}
                              onChange={e => handleUpdateRow(row.id, 'email', e.target.value)}
                              placeholder="email@empresa.com"
                              disabled={isMaster}
                              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                            />
                          </td>

                          {/* PERFIL / CARGO */}
                          <td className="p-2">
                            <select
                              value={row.role}
                              onChange={e => handleUpdateRow(row.id, 'role', e.target.value as UserRole)}
                              disabled={isMaster}
                              className={`w-full bg-zinc-900 border rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none transition-colors ${
                                isMaster
                                  ? 'border-amber-500/40 text-amber-300 font-bold'
                                  : isAdmin
                                  ? 'border-zinc-700 text-zinc-200 font-bold'
                                  : 'border-zinc-800 text-zinc-400'
                              }`}
                            >
                              <option value="colaborador">Colaborador</option>
                              <option value="admin">Administrador</option>
                              <option value="master">Master</option>
                            </select>
                          </td>

                          {/* DOCA ALOCADA */}
                          <td className="p-2">
                            <select
                              value={row.assignedDock}
                              onChange={e => handleUpdateRow(row.id, 'assignedDock', e.target.value)}
                              disabled={isMaster}
                              className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none transition-colors"
                            >
                              {dockOptions.map(dockName => (
                                <option key={dockName} value={dockName}>
                                  {dockName}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* PERMISSÃO: PACOTES */}
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canMovePackages}
                              onChange={e => handleUpdateRow(row.id, 'canMovePackages', e.target.checked)}
                              disabled={isMaster}
                              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                              title="Permitir movimentar pacotes"
                            />
                          </td>

                          {/* PERMISSÃO: CHAT */}
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canUseChat}
                              onChange={e => handleUpdateRow(row.id, 'canUseChat', e.target.checked)}
                              disabled={isMaster}
                              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-0 cursor-pointer"
                              title="Permitir usar chat das docas"
                            />
                          </td>

                          {/* PERMISSÃO: CEP */}
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canConsultCep}
                              onChange={e => handleUpdateRow(row.id, 'canConsultCep', e.target.checked)}
                              disabled={isMaster}
                              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                              title="Permitir consultar CEP"
                            />
                          </td>

                          {/* PERMISSÃO: PLANILHA */}
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canViewSpreadsheet}
                              onChange={e => handleUpdateRow(row.id, 'canViewSpreadsheet', e.target.checked)}
                              disabled={isMaster || isAdmin}
                              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-0 cursor-pointer"
                              title="Permitir visualizar planilha diária"
                            />
                          </td>

                          {/* STATUS ATIVO */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleUpdateRow(row.id, 'active', !row.active)}
                              disabled={isMaster}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                                row.active
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                              }`}
                            >
                              {row.active ? 'Ativo' : 'Inativo'}
                            </button>
                          </td>

                          {/* AÇÕES DA LINHA */}
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Quick Select / Test Login */}
                              <button
                                type="button"
                                onClick={() => {
                                  const targetUser = collaborators.find(c => c.id === row.id) || {
                                    id: row.id,
                                    name: row.name,
                                    username: row.username,
                                    role: row.role,
                                    pin: row.pin,
                                    email: row.email,
                                    assignedDock: row.assignedDock,
                                    active: row.active,
                                    isAdmin: row.role === 'admin' || row.role === 'master',
                                    isMaster: row.role === 'master',
                                    permissions: {
                                      canViewSpreadsheet: row.canViewSpreadsheet,
                                      canManageUsers: row.role === 'admin' || row.role === 'master',
                                      canCallDrivers: row.canCallDrivers,
                                      canCollectPackages: row.canCollectPackages,
                                      canConfigureDocks: row.canConfigureDocks,
                                      canMovePackages: row.canMovePackages,
                                      canUseChat: row.canUseChat,
                                      canConsultCep: row.canConsultCep,
                                    },
                                    createdAt: new Date().toISOString().slice(0, 10),
                                  };
                                  onSelectUser(targetUser);
                                  setSuccessMsg(`Logado como ${row.name || row.username}!`);
                                }}
                                title="Entrar e testar este usuário imediatamente"
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 transition-colors cursor-pointer"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Row */}
                              {!isMaster && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row)}
                                  title="Remover linha da planilha"
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* SPREADSHEET FOOTER ACTIONS */}
            <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="font-mono text-[11px]">
                  Total de {rows.length} logins na tabela ({rows.filter(r => r.active).length} ativos)
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleAddSpreadsheetRow}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Nova Linha</span>
                </button>

                <button
                  onClick={handleSaveAllRows}
                  disabled={isSavingBatch}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Save className={`w-4 h-4 ${isSavingBatch ? 'animate-spin' : ''}`} />
                  <span>Salvar Todos os Logins</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CARDS (VISÃO DETALHADA E FILTRADA) */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
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
              <div className="text-sm font-semibold text-zinc-100 mt-2 font-mono">
                gilianocosta804@gmail.com
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Acesso irrestrito a todas as 15 docas, permissões administrativas e movimentações de pacotes.
              </p>
            </div>

            {/* 4 ADMINS */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  Administrativos
                </span>
                <span className="text-xs font-bold font-mono text-zinc-200">{adminCount} Contas</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100 mt-2">
                Gestão &amp; Controle Total
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Controle de <strong>todas as docas simultaneamente</strong> e visualização da planilha em tempo real.
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
                Acesso restrito à sua própria doca para chamar veículos e registrar conferência.
              </p>
            </div>
          </div>

          {/* FILTER BUTTONS */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Filtrar por:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                roleFilter === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({collaborators.length})
            </button>
            <button
              onClick={() => setRoleFilter('master')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                roleFilter === 'master' ? 'bg-zinc-800 text-amber-300 font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Master ({masterCount})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                roleFilter === 'admin' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Administrativos ({adminCount})
            </button>
            <button
              onClick={() => setRoleFilter('colaborador')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                roleFilter === 'colaborador' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Colaboradores ({operatorCount})
            </button>
          </div>

          {/* CARDS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCollaborators.map(user => {
              const isMaster = user.isMaster || user.role === 'master';
              const isAdmin = (user.role === 'admin' || user.isAdmin) && !isMaster;
              const isCurrent = currentUser?.id === user.id;

              return (
                <div
                  key={user.id}
                  className={`p-4 rounded-xl border bg-zinc-950 space-y-3 transition-colors ${
                    isMaster
                      ? 'border-amber-500/30'
                      : isAdmin
                      ? 'border-zinc-700'
                      : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{user.name}</span>
                      {isMaster && <Crown className="w-4 h-4 text-amber-400" />}
                      {isAdmin && <ShieldCheck className="w-4 h-4 text-zinc-300" />}
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        isMaster
                          ? 'bg-amber-500/20 text-amber-300'
                          : isAdmin
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-zinc-400 font-mono">
                    <div>Login: <strong className="text-zinc-200">{user.username}</strong></div>
                    <div>PIN: <strong className="text-amber-300">{user.pin}</strong></div>
                    <div>Doca: <span className="text-zinc-300">{user.assignedDock || 'Geral'}</span></div>
                    {user.email && <div>Email: <span className="text-zinc-400">{user.email}</span></div>}
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-850">
                    {user.permissions?.canMovePackages && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                        Pacotes
                      </span>
                    )}
                    {user.permissions?.canUseChat && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold font-mono">
                        Chat
                      </span>
                    )}
                    {user.permissions?.canConsultCep && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                        CEP
                      </span>
                    )}
                    {user.permissions?.canViewSpreadsheet && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold font-mono">
                        Planilha
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                    <button
                      onClick={() => onSelectUser(user)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Entrar</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isMaster && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: COLAR DO EXCEL / GOOGLE SHEETS */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Colar Logins do Excel / Google Sheets</h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Copie as linhas da sua planilha (Ctrl+C) e cole na caixa abaixo (Ctrl+V). As colunas aceitas são:
              <br />
              <strong className="text-emerald-300 font-mono">
                Nome Completo | Usuário | Senha/PIN | Email | Perfil | Doca
              </strong>
            </p>

            <textarea
              rows={8}
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder={`Exemplo de linhas:\nJoão da Silva\tjoao.doca\t1234\tjoao@email.com\tcolaborador\tDoca 01\nMaria Santos\tmaria.doca\t1234\tmaria@email.com\tcolaborador\tDoca 02`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black cursor-pointer shadow-md"
              >
                Importar Linhas na Planilha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER (LEGACY) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-sm text-white">
                {editingUser ? 'Editar Colaborador' : 'Cadastrar Novo Usuário'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: João Silva"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Usuário de Login *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="joao.doca"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Senha / PIN *</label>
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Perfil / Cargo</label>
                  <select
                    value={role}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="colaborador">Colaborador de Doca</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Doca Alocada</label>
                  <select
                    value={assignedDock}
                    onChange={e => setAssignedDock(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {dockOptions.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
