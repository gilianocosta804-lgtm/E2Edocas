import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Download,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Crown,
  Key,
  RefreshCw,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { CollaboratorUser } from '../types';
import { batchSaveCollaborators, deleteCollaborator } from '../services/api';

interface LoginsSpreadsheetViewProps {
  collaborators: CollaboratorUser[];
  onRefresh: () => void;
  currentUser?: CollaboratorUser | null;
}

interface SpreadsheetRow {
  tempId: string;
  id?: string;
  name: string;
  username: string;
  pin: string;
  role: 'master' | 'admin' | 'colaborador';
  assignedDock: string;
  email: string;
  canMovePackages: boolean;
  canUseChat: boolean;
  canConsultCep: boolean;
  canViewSpreadsheet: boolean;
  canCallDrivers: boolean;
  canCollectPackages: boolean;
  isNew?: boolean;
}

export const LoginsSpreadsheetView: React.FC<LoginsSpreadsheetViewProps> = ({
  collaborators,
  onRefresh,
  currentUser,
}) => {
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');

  // Sync rows from existing collaborators
  useEffect(() => {
    if (collaborators && collaborators.length > 0) {
      const existingRows: SpreadsheetRow[] = collaborators.map(c => ({
        tempId: c.id,
        id: c.id,
        name: c.name || '',
        username: c.username || '',
        pin: c.pin || '',
        role: c.role || (c.isAdmin ? 'admin' : 'colaborador'),
        assignedDock: c.assignedDock || 'Geral',
        email: c.email || '',
        canMovePackages: Boolean(c.permissions?.canMovePackages),
        canUseChat: Boolean(c.permissions?.canUseChat),
        canConsultCep: Boolean(c.permissions?.canConsultCep),
        canViewSpreadsheet: Boolean(c.permissions?.canViewSpreadsheet),
        canCallDrivers: c.permissions?.canCallDrivers !== false,
        canCollectPackages: c.permissions?.canCollectPackages !== false,
        isNew: false,
      }));
      setRows(existingRows);
    } else {
      // Create 3 blank rows by default if none exist
      setRows([
        createBlankRow('Doca 01'),
        createBlankRow('Doca 02'),
        createBlankRow('Doca 03'),
      ]);
    }
  }, [collaborators]);

  function createBlankRow(defaultDock = 'Doca 01'): SpreadsheetRow {
    const randomId = `new-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      tempId: randomId,
      name: '',
      username: '',
      pin: '1234',
      role: 'colaborador',
      assignedDock: defaultDock,
      email: '',
      canMovePackages: false,
      canUseChat: false,
      canConsultCep: false,
      canViewSpreadsheet: false,
      canCallDrivers: true,
      canCollectPackages: true,
      isNew: true,
    };
  }

  const handleAddRow = (count = 1) => {
    const newItems: SpreadsheetRow[] = [];
    for (let i = 0; i < count; i++) {
      const nextDockNumber = (rows.length + i + 1);
      const dockName = nextDockNumber <= 10 ? `Doca ${String(nextDockNumber).padStart(2, '0')}` : 'Geral';
      newItems.push(createBlankRow(dockName));
    }
    setRows(prev => [...prev, ...newItems]);
    setFeedback({
      type: 'success',
      message: `${count === 1 ? '1 linha adicionada' : `${count} linhas adicionadas`} na planilha. Preencha os campos e clique em "Salvar Logins".`,
    });
  };

  const handleUpdateRow = (tempId: string, field: keyof SpreadsheetRow, value: any) => {
    setRows(prev =>
      prev.map(row => {
        if (row.tempId !== tempId) return row;
        const updated = { ...row, [field]: value };
        // Auto-fill username if empty and user types name
        if (field === 'name' && (!row.username || row.username === row.name.toLowerCase().replace(/\s+/g, '.'))) {
          updated.username = String(value).toLowerCase().trim().replace(/\s+/g, '.');
        }
        // Auto-adjust permissions if role changes to admin or master
        if (field === 'role') {
          if (value === 'admin' || value === 'master') {
            updated.canViewSpreadsheet = true;
            updated.canMovePackages = true;
            updated.canUseChat = true;
            updated.canConsultCep = true;
            updated.canCallDrivers = true;
            updated.canCollectPackages = true;
          }
        }
        return updated;
      })
    );
  };

  const handleDeleteRow = async (row: SpreadsheetRow) => {
    if (row.id) {
      if (row.role === 'master' || row.email === 'gilianocosta804@gmail.com') {
        alert('Não é possível excluir o Usuário Master do sistema.');
        return;
      }
      const confirmed = window.confirm(`Deseja realmente excluir o login de "${row.name || row.username}"?`);
      if (!confirmed) return;
      try {
        await deleteCollaborator(row.id);
        setRows(prev => prev.filter(r => r.tempId !== row.tempId));
        setFeedback({ type: 'success', message: `Login "${row.name}" removido com sucesso.` });
        onRefresh();
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Erro ao excluir usuário.' });
      }
    } else {
      setRows(prev => prev.filter(r => r.tempId !== row.tempId));
    }
  };

  // Process pasted table text from Excel / Google Sheets
  const handleProcessPastedData = () => {
    if (!pasteContent.trim()) {
      setShowPasteModal(false);
      return;
    }

    const lines = pasteContent.trim().split(/\r?\n/);
    const newParsedRows: SpreadsheetRow[] = [];

    for (const line of lines) {
      // Split by tab (Excel/Google Sheets) or comma/semicolon (CSV)
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(';')
        ? line.split(';')
        : line.split(',');

      if (parts.length === 0 || !parts[0].trim()) continue;

      const name = (parts[0] || '').trim();
      const username = (parts[1] || name.toLowerCase().replace(/\s+/g, '.')).trim();
      const pin = (parts[2] || '1234').trim();
      const rawRole = (parts[3] || 'colaborador').trim().toLowerCase();
      const role: 'master' | 'admin' | 'colaborador' =
        rawRole.includes('master') ? 'master' : rawRole.includes('adm') ? 'admin' : 'colaborador';
      const assignedDock = (parts[4] || 'Doca 01').trim();
      const email = (parts[5] || (username.includes('@') ? username : '')).trim();

      newParsedRows.push({
        tempId: `pasted-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name,
        username,
        pin,
        role,
        assignedDock,
        email,
        canMovePackages: role === 'master' || role === 'admin',
        canUseChat: role === 'master' || role === 'admin',
        canConsultCep: role === 'master' || role === 'admin',
        canViewSpreadsheet: role === 'master' || role === 'admin',
        canCallDrivers: true,
        canCollectPackages: true,
        isNew: true,
      });
    }

    if (newParsedRows.length > 0) {
      setRows(prev => [...prev, ...newParsedRows]);
      setFeedback({
        type: 'success',
        message: `${newParsedRows.length} logins colados com sucesso! Revise e clique em "Salvar Logins na Planilha".`,
      });
    }
    setPasteContent('');
    setShowPasteModal(false);
  };

  // Save all spreadsheet rows in batch
  const handleSaveAll = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      // Filter valid rows (must have at least name or username)
      const validRows = rows.filter(r => r.name.trim() || r.username.trim());
      if (validRows.length === 0) {
        setFeedback({ type: 'error', message: 'Nenhuma linha preenchida para salvar.' });
        setSaving(false);
        return;
      }

      // Check for empty passwords/PINs and fill with default
      const preparedPayload = validRows.map(r => ({
        id: r.id,
        name: r.name.trim() || r.username.trim(),
        username: (r.username.trim() || r.name.trim().toLowerCase().replace(/\s+/g, '.')).toLowerCase(),
        pin: r.pin.trim() || (r.role === 'master' ? 'Gili2112#@' : '1234'),
        role: r.role,
        email: r.email.trim(),
        assignedDock: r.assignedDock.trim() || 'Geral',
        permissions: {
          canViewSpreadsheet: r.role === 'admin' || r.role === 'master' || r.canViewSpreadsheet,
          canManageUsers: r.role === 'admin' || r.role === 'master',
          canCallDrivers: r.canCallDrivers,
          canCollectPackages: r.canCollectPackages,
          canConfigureDocks: r.role === 'admin' || r.role === 'master',
          canMovePackages: r.role === 'admin' || r.role === 'master' || r.canMovePackages,
          canUseChat: r.role === 'admin' || r.role === 'master' || r.canUseChat,
          canConsultCep: r.role === 'admin' || r.role === 'master' || r.canConsultCep,
        },
      }));

      const res = await batchSaveCollaborators(preparedPayload);
      setFeedback({
        type: 'success',
        message: `Planilha de Logins salva com sucesso! (${res.createdCount} criados, ${res.updatedCount} atualizados).`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao salvar logins da planilha.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open('/api/collaborators-sheet/csv', '_blank');
  };

  return (
    <div className="space-y-4">
      {/* ACTION TOOLBAR BANNER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Planilha de Alimentação &amp; Criação de Logins
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {rows.length} {rows.length === 1 ? 'Login' : 'Logins'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Crie e edite logins diretamente nas linhas da planilha ou cole dados copiados do Excel / Google Sheets
            </p>
          </div>
        </div>

        {/* BUTTON ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleAddRow(1)}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 text-xs font-semibold border border-zinc-750 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ 1 Linha</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddRow(5)}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 text-xs font-semibold border border-zinc-750 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ 5 Linhas</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-xs font-semibold border border-blue-500/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Copie linhas do seu Excel ou Google Sheets e cole aqui"
          >
            <ClipboardPaste className="w-4 h-4 text-blue-400" />
            <span>Colar do Excel / Sheets</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar planilha de logins em formato CSV"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            <span>Baixar CSV</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-zinc-950" />
            <span>{saving ? 'Salvando...' : 'Salvar Logins na Planilha'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* EDITABLE SPREADSHEET TABLE */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead className="bg-zinc-900/90 text-zinc-300 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="p-3 w-10 text-center text-zinc-500">#</th>
                <th className="p-3 min-w-[180px]">Nome Completo *</th>
                <th className="p-3 min-w-[150px]">Login / Usuário *</th>
                <th className="p-3 min-w-[130px]">Senha / PIN *</th>
                <th className="p-3 min-w-[130px]">Cargo / Perfil</th>
                <th className="p-3 min-w-[130px]">Doca Alocada</th>
                <th className="p-3 min-w-[180px]">E-mail Corporativo</th>
                <th className="p-3 text-center min-w-[80px]" title="Autorização para Movimentar Pacotes entre Rotas">
                  Pacotes
                </th>
                <th className="p-3 text-center min-w-[80px]" title="Autorização para Usar Chat com ADM">
                  Chat
                </th>
                <th className="p-3 text-center min-w-[80px]" title="Autorização para Consulta Oficial de CEP">
                  CEP
                </th>
                <th className="p-3 text-center min-w-[80px]" title="Autorização para Visualizar Planilha Diária">
                  Planilha
                </th>
                <th className="p-3 w-12 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 text-zinc-200">
              {rows.map((row, idx) => {
                const isMaster = row.role === 'master' || row.email === 'gilianocosta804@gmail.com';
                const isAdmin = row.role === 'admin';

                return (
                  <tr
                    key={row.tempId}
                    className={`hover:bg-zinc-900/50 transition-colors ${
                      isMaster
                        ? 'bg-amber-950/20'
                        : row.isNew
                        ? 'bg-emerald-950/10'
                        : ''
                    }`}
                  >
                    {/* NUMBER */}
                    <td className="p-2.5 text-center font-mono text-zinc-500 text-[11px]">
                      {idx + 1}
                    </td>

                    {/* NAME */}
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={row.name}
                          onChange={e => handleUpdateRow(row.tempId, 'name', e.target.value)}
                          placeholder="Ex: Roberto Silva"
                          className="w-full bg-zinc-900/90 border border-zinc-750 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                        />
                        {isMaster && (
                          <span title="Usuário Master">
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* USERNAME */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.username}
                        onChange={e => handleUpdateRow(row.tempId, 'username', e.target.value)}
                        placeholder="Ex: roberto.doca"
                        className="w-full bg-zinc-900/90 border border-zinc-750 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none"
                      />
                    </td>

                    {/* PIN / SENHA */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.pin}
                        onChange={e => handleUpdateRow(row.tempId, 'pin', e.target.value)}
                        placeholder="Gili2112#@ ou 1234"
                        className="w-full bg-zinc-900/90 border border-zinc-750 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-200 placeholder-zinc-500 focus:outline-none tracking-wider"
                      />
                    </td>

                    {/* ROLE */}
                    <td className="p-2">
                      <select
                        value={row.role}
                        disabled={isMaster}
                        onChange={e => handleUpdateRow(row.tempId, 'role', e.target.value)}
                        className="w-full bg-zinc-900/90 border border-zinc-750 focus:border-amber-400 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                      >
                        <option value="colaborador">Colaborador</option>
                        <option value="admin">Administrador</option>
                        <option value="master">Master</option>
                      </select>
                    </td>

                    {/* ASSIGNED DOCK */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.assignedDock}
                        onChange={e => handleUpdateRow(row.tempId, 'assignedDock', e.target.value)}
                        placeholder="Doca 01 ou Geral"
                        className="w-full bg-zinc-900/90 border border-zinc-750 focus:border-amber-400 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none"
                      />
                    </td>

                    {/* EMAIL */}
                    <td className="p-2">
                      <input
                        type="email"
                        value={row.email}
                        onChange={e => handleUpdateRow(row.tempId, 'email', e.target.value)}
                        placeholder="exemplo@gmail.com"
                        className="w-full bg-zinc-900/90 border border-zinc-750 focus:border-amber-400 rounded-lg px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-mono"
                      />
                    </td>

                    {/* PERMISSION: PACOTES */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isMaster || isAdmin || row.canMovePackages}
                        disabled={isMaster || isAdmin}
                        onChange={e => handleUpdateRow(row.tempId, 'canMovePackages', e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-950 border-amber-500/60 text-amber-500 focus:ring-0 cursor-pointer"
                        title="Permitir movimentar pacotes entre rotas"
                      />
                    </td>

                    {/* PERMISSION: CHAT */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isMaster || isAdmin || row.canUseChat}
                        disabled={isMaster || isAdmin}
                        onChange={e => handleUpdateRow(row.tempId, 'canUseChat', e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-950 border-blue-500/60 text-blue-500 focus:ring-0 cursor-pointer"
                        title="Permitir usar Chat com ADM"
                      />
                    </td>

                    {/* PERMISSION: CEP */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isMaster || isAdmin || row.canConsultCep}
                        disabled={isMaster || isAdmin}
                        onChange={e => handleUpdateRow(row.tempId, 'canConsultCep', e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-950 border-emerald-500/60 text-emerald-500 focus:ring-0 cursor-pointer"
                        title="Permitir consulta de CEP"
                      />
                    </td>

                    {/* PERMISSION: PLANILHA */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isMaster || isAdmin || row.canViewSpreadsheet}
                        disabled={isMaster || isAdmin}
                        onChange={e => handleUpdateRow(row.tempId, 'canViewSpreadsheet', e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-zinc-200 focus:ring-0 cursor-pointer"
                        title="Permitir visualizar planilha diária"
                      />
                    </td>

                    {/* ACTIONS */}
                    <td className="p-2 text-center">
                      {!isMaster ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row)}
                          className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Remover linha da planilha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400 font-bold">Fix</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* BOTTOM HELPER BAR */}
        <div className="p-3 bg-zinc-900/60 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Dica: Digite os dados diretamente nas células da tabela.</span>
            <span>&bull;</span>
            <span className="text-amber-300 font-medium">Acesso Master atual: gilianocosta804@gmail.com / Gili2112#@</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddRow(1)}
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              + Adicionar Linha
            </button>
            <span>&bull;</span>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className="text-white hover:text-amber-300 font-bold underline"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      {/* PASTE FROM EXCEL MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-zinc-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-sm text-white">
                  Colar Linhas do Excel ou Google Sheets
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Copie as linhas da sua planilha (Excel ou Google Sheets) e cole na caixa abaixo. O sistema irá separar as colunas automaticamente:
              <br />
              <span className="font-mono text-[11px] text-amber-300">
                Nome [TAB] Usuário [TAB] Senha [TAB] Perfil [TAB] Doca [TAB] Email
              </span>
            </p>

            <textarea
              rows={6}
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              placeholder={`Exemplo:\nRoberto Silva\troberto.silva\t1234\tcolaborador\tDoca 01\troberto@gmail.com\nCarlos Lima\tcarlos.lima\t1234\tadmin\tGeral\tcarlos@gmail.com`}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessPastedData}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                Inserir Linhas na Planilha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
