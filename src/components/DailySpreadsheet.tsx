import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronDown,
  Lock,
  Package,
  Tag,
  ShieldCheck,
  Crown,
  Boxes,
  Plus,
  Save,
  ClipboardPaste,
  Truck,
  Building2,
  Table,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { DailySheetSummary, DockConfig, DriverCheckIn, CheckInStatus } from '../types';
import {
  fetchCheckIns,
  fetchDailySheetsSummary,
  resetTodayQueue,
  syncMasterGoogle,
  batchSaveFormsSheet,
  batchUpdateDocks,
  addDock,
} from '../services/api';

interface DailySpreadsheetProps {
  currentCheckIns: DriverCheckIn[];
  onRefresh: () => void;
  isAdmin: boolean;
  docks?: DockConfig[];
}

export const DailySpreadsheet: React.FC<DailySpreadsheetProps> = ({
  currentCheckIns,
  onRefresh,
  isAdmin,
  docks = [],
}) => {
  // Main Tab: 'forms' (Alimentação do Forms), 'docks' (Alimentação das Docas), 'realtime' (Visão Consolidada / Histórico)
  const [activeSheetTab, setActiveSheetTab] = useState<'forms' | 'docks' | 'realtime'>('forms');

  const todayDate = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [summaries, setSummaries] = useState<DailySheetSummary[]>([]);
  const [sheetData, setSheetData] = useState<DriverCheckIn[]>(currentCheckIns);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<boolean | 'all'>('all');
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [googleSyncSuccess, setGoogleSyncSuccess] = useState(false);

  // --- FORMS SPREADSHEET STATE ---
  const [formsRows, setFormsRows] = useState<Partial<DriverCheckIn>[]>([]);
  const [isSavingForms, setIsSavingForms] = useState(false);
  const [showPasteFormsModal, setShowPasteFormsModal] = useState(false);
  const [pastedFormsText, setPastedFormsText] = useState('');

  // --- DOCKS SPREADSHEET STATE ---
  const [docksRows, setDocksRows] = useState<DockConfig[]>([]);
  const [isSavingDocks, setIsSavingDocks] = useState(false);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync forms rows from currentCheckIns
  useEffect(() => {
    setFormsRows(currentCheckIns);
  }, [currentCheckIns]);

  // Sync docks rows from docks prop
  useEffect(() => {
    if (docks && docks.length > 0) {
      setDocksRows(docks);
    }
  }, [docks]);

  // Load sheets summary list
  useEffect(() => {
    fetchDailySheetsSummary()
      .then(res => setSummaries(res))
      .catch(console.error);
  }, [currentCheckIns.length]);

  // When date changes in realtime tab
  useEffect(() => {
    if (selectedDate === todayDate) {
      setSheetData(currentCheckIns);
    } else {
      setLoading(true);
      fetchCheckIns(selectedDate)
        .then(res => setSheetData(res))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedDate, currentCheckIns, todayDate]);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Acesso Restrito à Planilha</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Esta planilha de controle em tempo real é restrita exclusivamente aos usuários Administrativos e ao Usuário Master.
        </p>
      </div>
    );
  }

  // --- FORMS SPREADSHEET ACTIONS ---

  // 1. Add blank row in forms spreadsheet
  const handleAddFormsRow = () => {
    const tempId = `new-chk-${Date.now()}`;
    const nextTicket = formsRows.length + 1;
    const now = new Date();

    const newRow: Partial<DriverCheckIn> = {
      id: tempId,
      ticketNumber: nextTicket,
      driverName: '',
      licensePlate: '',
      phoneNumber: '',
      route: '01A',
      city: 'Gama - DF',
      arrivalDate: todayDate,
      arrivalTime: now.toTimeString().slice(0, 8),
      isPriority: false,
      status: 'waiting',
      assignedDock: null,
      packageCount: null,
      iscaNumber: null,
      collectorName: '',
      notes: '',
    };

    setFormsRows(prev => [newRow, ...prev]);
    setSuccessMsg('Nova linha adicionada no topo da Planilha do Forms! Preencha e clique em "Salvar Alimentação do Forms".');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // 2. Update a field in a forms spreadsheet row
  const handleUpdateFormsRow = (id: string | undefined, field: keyof DriverCheckIn, value: any) => {
    if (!id) return;
    setFormsRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        return { ...r, [field]: value };
      })
    );
  };

  // 3. Delete a row from forms spreadsheet
  const handleDeleteFormsRow = (id: string | undefined) => {
    if (!id) return;
    setFormsRows(prev => prev.filter(r => r.id !== id));
  };

  // 4. Save all forms spreadsheet rows
  const handleSaveFormsRows = async () => {
    setIsSavingForms(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const valid = formsRows.filter(r => r.driverName?.trim() || r.licensePlate?.trim() || r.route?.trim());
      if (valid.length === 0) {
        throw new Error('Nenhuma linha preenchida para salvar na planilha do Forms.');
      }

      const res = await batchSaveFormsSheet(valid, todayDate);
      setSuccessMsg(`✅ Planilha de Alimentação do Forms salva com sucesso! (${res.addedCount} adicionados, ${res.updatedCount} atualizados na fila).`);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar alimentação do Forms.');
    } finally {
      setIsSavingForms(false);
    }
  };

  // 5. Parse pasted text from Google Forms / Excel
  const handleParsePastedForms = () => {
    if (!pastedFormsText.trim()) {
      setShowPasteFormsModal(false);
      return;
    }

    const lines = pastedFormsText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const newParsed: Partial<DriverCheckIn>[] = [];
    const now = new Date();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let parts = line.includes('\t') ? line.split('\t') : line.split(/[,;]/);
      parts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));

      if (parts.length === 0 || !parts[0]) continue;

      // Skip header row if copied with headers
      if (
        i === 0 &&
        (parts[0].toLowerCase().includes('carimbo') ||
          parts[0].toLowerCase().includes('data') ||
          parts[0].toLowerCase().includes('nome') ||
          parts[0].toLowerCase().includes('motorista'))
      ) {
        continue;
      }

      // Order of typical Google Forms: [Timestamp], DriverName, Plate, Phone, Route, City, Priority, Notes
      const colDriver = parts[0] || parts[1] || 'Motorista';
      const colPlate = (parts[1]?.length <= 8 && /[0-9]/.test(parts[1]) ? parts[1] : parts[2] || 'ABC1D23').toUpperCase();
      const colPhone = parts[3] || '';
      const colRoute = parts[4] || '01A';
      const colCity = parts[5] || 'Gama - DF';
      const colPriority = (parts[6] || '').toLowerCase().includes('sim');
      const colNotes = parts[7] || '';

      newParsed.push({
        id: `pasted-chk-${Date.now()}-${i}`,
        ticketNumber: formsRows.length + newParsed.length + 1,
        driverName: colDriver,
        licensePlate: colPlate,
        phoneNumber: colPhone,
        route: colRoute,
        city: colCity,
        arrivalDate: todayDate,
        arrivalTime: now.toTimeString().slice(0, 8),
        isPriority: colPriority,
        status: 'waiting',
        assignedDock: null,
        packageCount: null,
        notes: colNotes,
      });
    }

    if (newParsed.length > 0) {
      setFormsRows(prev => [...newParsed, ...prev]);
      setSuccessMsg(`📋 ${newParsed.length} linha(s) importada(s) do Forms/Excel! Clique em "Salvar Alimentação do Forms" para sincronizar com a fila.`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } else {
      alert('Nenhum dado válido reconhecido no texto colado.');
    }

    setPastedFormsText('');
    setShowPasteFormsModal(false);
  };

  // --- DOCKS SPREADSHEET ACTIONS ---

  // 1. Update field in dock row
  const handleUpdateDockRow = (id: string, field: keyof DockConfig, value: any) => {
    setDocksRows(prev =>
      prev.map(d => {
        if (d.id !== id) return d;
        return { ...d, [field]: value };
      })
    );
  };

  // 2. Add new dock row
  const handleAddNewDock = async () => {
    try {
      const res = await addDock();
      setDocksRows(prev => [...prev, res.dock]);
      setSuccessMsg(`Nova doca (${res.dock.name}) adicionada na planilha!`);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar doca.');
    }
  };

  // 3. Save all docks spreadsheet rows
  const handleSaveDocksRows = async () => {
    setIsSavingDocks(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = docksRows.map(d => ({
        id: d.id,
        number: d.number,
        name: d.name,
        activeOperatorName: d.activeOperatorName,
        status: d.status,
        pausedReason: d.pausedReason,
      }));

      await batchUpdateDocks(payload);
      setSuccessMsg('✅ Planilha de Alimentação das Docas salva e sincronizada em tempo real!');
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar alimentação das docas.');
    } finally {
      setIsSavingDocks(false);
    }
  };

  // Downloads CSVs
  const handleDownloadFormsCsv = () => {
    window.open(`/api/forms-sheet/csv?date=${todayDate}`, '_blank');
  };

  const handleDownloadDocksCsv = () => {
    window.open('/api/docks-sheet/csv', '_blank');
  };

  const handleDownloadRealtimeCsv = () => {
    window.open(`/api/daily-sheets/${selectedDate}/csv`, '_blank');
  };

  const handleSyncGoogle = async () => {
    setSyncingGoogle(true);
    try {
      await syncMasterGoogle();
      setGoogleSyncSuccess(true);
      setTimeout(() => setGoogleSyncSuccess(false), 4000);
    } catch (err: any) {
      alert('Erro ao sincronizar com o Google: ' + err.message);
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleResetToday = async () => {
    const confirmed = window.confirm(
      'Tem certeza de que deseja resetar e limpar a fila de hoje? Essa ação não pode ser desfeita.'
    );
    if (!confirmed) return;

    try {
      await resetTodayQueue();
      onRefresh();
    } catch (err: any) {
      alert('Erro ao resetar: ' + err.message);
    }
  };

  // Filtered rows for Realtime Tab
  const filteredRealtimeRows = sheetData
    .filter(row => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && row.isPriority !== priorityFilter) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        row.driverName.toLowerCase().includes(q) ||
        row.licensePlate.toLowerCase().includes(q) ||
        row.route.toLowerCase().includes(q) ||
        row.city.toLowerCase().includes(q) ||
        (row.assignedDock && row.assignedDock.toLowerCase().includes(q)) ||
        (row.collectorName && row.collectorName.toLowerCase().includes(q)) ||
        (row.iscaNumber && row.iscaNumber.toLowerCase().includes(q)) ||
        String(row.ticketNumber).includes(q)
      );
    })
    .sort((a, b) => a.ticketNumber - b.ticketNumber);

  const totalRows = sheetData.length;
  const completedRows = sheetData.filter(r => r.status === 'completed').length;
  const priorityRows = sheetData.filter(r => r.isPriority).length;
  const totalPackages = sheetData.reduce((acc, r) => acc + (r.packageCount || 0), 0);

  // Common dock select options
  const dockSelectOptions = [
    '',
    ...Array.from({ length: 15 }, (_, i) => `Doca ${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER BANNER WITH SUB-TABS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Planilhas Operacionais &bull; E2E DOCAS
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Sincronização Ativa
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Planilha diária de alimentação do Forms e planilha de alimentação das docas em tempo real
            </p>
          </div>
        </div>

        {/* THREE PRIMARY SPREADSHEET TABS */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs w-full md:w-auto">
          {/* TAB 1: ALIMENTAÇÃO DO FORMS */}
          <button
            onClick={() => setActiveSheetTab('forms')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeSheetTab === 'forms'
                ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Planilha Alimentação do Forms</span>
          </button>

          {/* TAB 2: ALIMENTAÇÃO DAS DOCAS */}
          <button
            onClick={() => setActiveSheetTab('docks')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeSheetTab === 'docks'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Planilha Alimentação das Docas</span>
          </button>

          {/* TAB 3: VISÃO CONSOLIDADA */}
          <button
            onClick={() => setActiveSheetTab('realtime')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              activeSheetTab === 'realtime'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Histórico / Ao Vivo</span>
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

      {/* ========================================================================= */}
      {/* TAB 1: PLANILHA DIÁRIA PARA ALIMENTAÇÃO DO FORMS */}
      {/* ========================================================================= */}
      {activeSheetTab === 'forms' && (
        <div className="space-y-4 animate-in fade-in">
          {/* TOOLBAR */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Alimentação do Forms:</strong> Digite motoristas nas linhas da planilha ou cole do Google Forms/Excel. As alterações alimentam a fila diária ao clicar em <strong>Salvar Alimentação do Forms</strong>.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleAddFormsRow}
                className="px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Adicionar Linha</span>
              </button>

              <button
                onClick={() => setShowPasteFormsModal(true)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-800"
              >
                <ClipboardPaste className="w-4 h-4 text-zinc-400" />
                <span>Colar do Forms / Excel</span>
              </button>

              <button
                onClick={handleDownloadFormsCsv}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-800"
                title="Exportar planilha de alimentação em CSV"
              >
                <Download className="w-4 h-4 text-zinc-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleSaveFormsRows}
                disabled={isSavingForms}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Save className={`w-4 h-4 ${isSavingForms ? 'animate-spin' : ''}`} />
                <span>{isSavingForms ? 'Salvando...' : 'Salvar Alimentação do Forms'}</span>
              </button>
            </div>
          </div>

          {/* FORMS SPREADSHEET TABLE */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center">Senha</th>
                    <th className="p-3 min-w-[90px]">Chegada</th>
                    <th className="p-3 min-w-[180px]">Nome do Motorista *</th>
                    <th className="p-3 min-w-[120px]">Placa *</th>
                    <th className="p-3 min-w-[130px]">WhatsApp / Fone</th>
                    <th className="p-3 min-w-[100px]">Rota *</th>
                    <th className="p-3 min-w-[140px]">Cidade / Região *</th>
                    <th className="p-3 text-center min-w-[80px]">Prioritário</th>
                    <th className="p-3 min-w-[110px]">Status</th>
                    <th className="p-3 min-w-[120px]">Doca Atribuída</th>
                    <th className="p-3 min-w-[100px]">Pacotes</th>
                    <th className="p-3 min-w-[110px]">Nº Isca</th>
                    <th className="p-3 min-w-[130px]">Conferente</th>
                    <th className="p-3 min-w-[180px]">Observações</th>
                    <th className="p-3 text-right w-12">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-200 font-sans">
                  {formsRows.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="p-8 text-center text-zinc-500">
                        Nenhum motorista na planilha de hoje. Clique em "+ Adicionar Linha" ou "Colar do Forms" para alimentar!
                      </td>
                    </tr>
                  ) : (
                    formsRows.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-zinc-900/60 transition-colors">
                        {/* SENHA */}
                        <td className="p-2.5 text-center font-mono font-bold text-amber-300 text-xs">
                          {String(row.ticketNumber || idx + 1).padStart(3, '0')}
                        </td>

                        {/* HORÁRIO */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.arrivalTime || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'arrivalTime', e.target.value)}
                            placeholder="08:00:00"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none"
                          />
                        </td>

                        {/* NOME DO MOTORISTA */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.driverName || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'driverName', e.target.value)}
                            placeholder="Nome completo"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-white font-medium focus:outline-none"
                          />
                        </td>

                        {/* PLACA */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.licensePlate || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'licensePlate', e.target.value.toUpperCase())}
                            placeholder="BRA2E19"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono font-bold text-zinc-200 focus:outline-none"
                          />
                        </td>

                        {/* TELEFONE */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.phoneNumber || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'phoneNumber', e.target.value)}
                            placeholder="(61) 99999-9999"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-zinc-400 focus:outline-none"
                          />
                        </td>

                        {/* ROTA */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.route || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'route', e.target.value.toUpperCase())}
                            placeholder="01A"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 focus:outline-none"
                          />
                        </td>

                        {/* CIDADE / REGIÃO */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.city || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'city', e.target.value)}
                            placeholder="Gama - DF"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                          />
                        </td>

                        {/* PRIORITÁRIO */}
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.isPriority)}
                            onChange={e => handleUpdateFormsRow(row.id, 'isPriority', e.target.checked)}
                            className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* STATUS */}
                        <td className="p-2">
                          <select
                            value={row.status || 'waiting'}
                            onChange={e => handleUpdateFormsRow(row.id, 'status', e.target.value as CheckInStatus)}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none"
                          >
                            <option value="waiting">Aguardando</option>
                            <option value="called">Chamado</option>
                            <option value="at_dock">Na Doca</option>
                            <option value="completed">Concluído</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </td>

                        {/* DOCA ATRIBUÍDA */}
                        <td className="p-2">
                          <select
                            value={row.assignedDock || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'assignedDock', e.target.value || null)}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none"
                          >
                            <option value="">(Nenhuma)</option>
                            {dockSelectOptions.filter(Boolean).map(dock => (
                              <option key={dock} value={dock}>
                                {dock}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* PACOTES */}
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.packageCount !== null && row.packageCount !== undefined ? row.packageCount : ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'packageCount', e.target.value ? Number(e.target.value) : null)}
                            placeholder="0"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none"
                          />
                        </td>

                        {/* ISCA */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.iscaNumber || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'iscaNumber', e.target.value)}
                            placeholder="Nº Isca"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none"
                          />
                        </td>

                        {/* CONFERENTE */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.collectorName || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'collectorName', e.target.value)}
                            placeholder="Operador"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                          />
                        </td>

                        {/* OBSERVAÇÕES */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={e => handleUpdateFormsRow(row.id, 'notes', e.target.value)}
                            placeholder="Observações da rota..."
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none"
                          />
                        </td>

                        {/* EXCLUIR LINHA */}
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteFormsRow(row.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SPREADSHEET FOOTER */}
            <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="font-mono text-zinc-400 text-[11px]">
                Total de {formsRows.length} registros na planilha de hoje ({formsRows.filter(r => r.status === 'completed').length} concluídos)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddFormsRow}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Linha</span>
                </button>

                <button
                  onClick={handleSaveFormsRows}
                  disabled={isSavingForms}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Save className={`w-4 h-4 ${isSavingForms ? 'animate-spin' : ''}`} />
                  <span>Salvar Alimentação do Forms</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PLANILHA DE ALIMENTAÇÃO DAS DOCAS */}
      {/* ========================================================================= */}
      {activeSheetTab === 'docks' && (
        <div className="space-y-4 animate-in fade-in">
          {/* TOOLBAR */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Alimentação das Docas (01 a 15):</strong> Configure os operadores responsáveis por cada doca, pause/retome atendimentos e altere o status das docas em lote na planilha.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleAddNewDock}
                className="px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Adicionar Nova Doca</span>
              </button>

              <button
                onClick={handleDownloadDocksCsv}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-800"
                title="Exportar planilha de docas em CSV"
              >
                <Download className="w-4 h-4 text-zinc-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleSaveDocksRows}
                disabled={isSavingDocks}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Save className={`w-4 h-4 ${isSavingDocks ? 'animate-spin' : ''}`} />
                <span>{isSavingDocks ? 'Salvando...' : 'Salvar Alimentação das Docas'}</span>
              </button>
            </div>
          </div>

          {/* DOCKS SPREADSHEET TABLE */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center">Nº</th>
                    <th className="p-3 min-w-[130px]">Nome da Doca *</th>
                    <th className="p-3 min-w-[140px]">Status Operacional *</th>
                    <th className="p-3 min-w-[180px]">Operador Alocado</th>
                    <th className="p-3 min-w-[180px]">Motorista em Atendimento</th>
                    <th className="p-3 min-w-[90px]">Senha</th>
                    <th className="p-3 min-w-[100px]">Rota</th>
                    <th className="p-3 text-center min-w-[90px]">Pausa Ativa</th>
                    <th className="p-3 min-w-[180px]">Motivo da Pausa</th>
                    <th className="p-3 text-right min-w-[110px]">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-200 font-sans">
                  {docksRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-500">
                        Nenhuma doca configurada. Clique em "+ Adicionar Nova Doca" para iniciar!
                      </td>
                    </tr>
                  ) : (
                    docksRows.map((dock, idx) => (
                      <tr key={dock.id || idx} className="hover:bg-zinc-900/60 transition-colors">
                        {/* Nº DOCA */}
                        <td className="p-3 text-center font-mono font-bold text-zinc-400">
                          {dock.number || idx + 1}
                        </td>

                        {/* NOME DA DOCA */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={dock.name}
                            onChange={e => handleUpdateDockRow(dock.id, 'name', e.target.value)}
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                          />
                        </td>

                        {/* STATUS */}
                        <td className="p-2">
                          <select
                            value={dock.status}
                            onChange={e => handleUpdateDockRow(dock.id, 'status', e.target.value as any)}
                            className={`w-full bg-zinc-900 border rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                              dock.status === 'free'
                                ? 'border-emerald-500/40 text-emerald-300'
                                : dock.status === 'calling'
                                ? 'border-amber-500/40 text-amber-300'
                                : dock.status === 'occupied'
                                ? 'border-blue-500/40 text-blue-300'
                                : dock.status === 'paused'
                                ? 'border-zinc-700 text-zinc-400'
                                : 'border-rose-500/40 text-rose-300'
                            }`}
                          >
                            <option value="free">Livre / Disponível</option>
                            <option value="calling">Chamando Motorista</option>
                            <option value="occupied">Ocupada / Atendendo</option>
                            <option value="paused">Pausada</option>
                            <option value="maintenance">Manutenção</option>
                          </select>
                        </td>

                        {/* OPERADOR ALOCADO */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={dock.activeOperatorName || ''}
                            onChange={e => handleUpdateDockRow(dock.id, 'activeOperatorName', e.target.value || null)}
                            placeholder="Nome do operador"
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                          />
                        </td>

                        {/* MOTORISTA EM ATENDIMENTO */}
                        <td className="p-2">
                          <span className="font-medium text-zinc-300">
                            {dock.currentDriverName || <span className="text-zinc-600 font-mono">-</span>}
                          </span>
                        </td>

                        {/* SENHA */}
                        <td className="p-2 font-mono text-amber-300 font-bold">
                          {dock.currentTicketNumber ? String(dock.currentTicketNumber).padStart(3, '0') : '-'}
                        </td>

                        {/* ROTA */}
                        <td className="p-2 font-mono text-zinc-300 font-bold">
                          {dock.currentRoute || '-'}
                        </td>

                        {/* PAUSA ATIVA */}
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(dock.isPaused || dock.status === 'paused')}
                            onChange={e => {
                              const checked = e.target.checked;
                              handleUpdateDockRow(dock.id, 'isPaused', checked);
                              handleUpdateDockRow(dock.id, 'status', checked ? 'paused' : 'free');
                            }}
                            className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* MOTIVO DA PAUSA */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={dock.pausedReason || ''}
                            onChange={e => handleUpdateDockRow(dock.id, 'pausedReason', e.target.value)}
                            placeholder="Almoço, troca de turno..."
                            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                          />
                        </td>

                        {/* AÇÃO RÁPIDA */}
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const isPaused = dock.status === 'paused' || dock.isPaused;
                              handleUpdateDockRow(dock.id, 'status', isPaused ? 'free' : 'paused');
                              handleUpdateDockRow(dock.id, 'isPaused', !isPaused);
                              if (!isPaused && !dock.pausedReason) {
                                handleUpdateDockRow(dock.id, 'pausedReason', 'Pausa Operacional');
                              }
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                              dock.status === 'paused' || dock.isPaused
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {dock.status === 'paused' || dock.isPaused ? 'Retomar' : 'Pausar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* DOCKS FOOTER */}
            <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="font-mono text-zinc-400 text-[11px]">
                Total de {docksRows.length} docas ativas no Condomínio SYS Gama
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddNewDock}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Adicionar Nova Doca</span>
                </button>

                <button
                  onClick={handleSaveDocksRows}
                  disabled={isSavingDocks}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Save className={`w-4 h-4 ${isSavingDocks ? 'animate-spin' : ''}`} />
                  <span>Salvar Alimentação das Docas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VISÃO CONSOLIDADA & HISTÓRICO (ORIGINAL CONTROLE EM TEMPO REAL) */}
      {/* ========================================================================= */}
      {activeSheetTab === 'realtime' && (
        <div className="space-y-6 animate-in fade-in">
          {/* DATE SELECTOR & RESET */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Data da Planilha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-zinc-100 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadRealtimeCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium border border-zinc-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              {selectedDate === todayDate && (
                <button
                  onClick={handleResetToday}
                  title="Resetar e limpar fila diária"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-850 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* GOOGLE SHEETS MASTER ACCOUNT CONNECTION BANNER */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">Conta Google Master Conectada:</span>
                  <span className="font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    gilianocosta804@gmail.com
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Planilhas e formulários são criados no login principal e sincronizados pelas docas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {googleSyncSuccess && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sincronizado com Sucesso
                </span>
              )}
              <button
                onClick={handleSyncGoogle}
                disabled={syncingGoogle}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium border border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingGoogle ? 'animate-spin' : ''}`} />
                <span>{syncingGoogle ? 'Sincronizando...' : 'Sincronizar Google Sheets'}</span>
              </button>
            </div>
          </div>

          {/* METRIC PILLS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Total Check-ins</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">{totalRows}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Coletas Concluídas</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{completedRows}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Pacotes Conferidos</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">{totalPackages}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Prioritários</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{priorityRows}</div>
            </div>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar motorista, placa, rota..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="waiting">Aguardando</option>
                <option value="called">Chamado</option>
                <option value="at_dock">Na Doca</option>
                <option value="completed">Concluído</option>
              </select>

              <select
                value={String(priorityFilter)}
                onChange={e =>
                  setPriorityFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')
                }
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none"
              >
                <option value="all">Todas as Prioridades</option>
                <option value="true">Apenas Prioritários</option>
                <option value="false">Normais</option>
              </select>
            </div>
          </div>

          {/* READ-ONLY / AUDIT TABLE */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-3 text-center">Senha</th>
                    <th className="p-3">Horário</th>
                    <th className="p-3">Motorista</th>
                    <th className="p-3">Placa</th>
                    <th className="p-3">Rota</th>
                    <th className="p-3">Cidade</th>
                    <th className="p-3">Doca</th>
                    <th className="p-3">Pacotes</th>
                    <th className="p-3">Isca</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-300">
                  {filteredRealtimeRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-500">
                        Nenhum registro encontrado para esta data.
                      </td>
                    </tr>
                  ) : (
                    filteredRealtimeRows.map(row => (
                      <tr key={row.id} className="hover:bg-zinc-900/40">
                        <td className="p-3 text-center font-mono font-bold text-amber-300">
                          {String(row.ticketNumber).padStart(3, '0')}
                        </td>
                        <td className="p-3 font-mono text-zinc-400">{row.arrivalTime}</td>
                        <td className="p-3 font-medium text-white">{row.driverName}</td>
                        <td className="p-3 font-mono">{row.licensePlate}</td>
                        <td className="p-3 font-mono font-bold text-amber-300">{row.route}</td>
                        <td className="p-3 text-zinc-400">{row.city}</td>
                        <td className="p-3 font-mono">{row.assignedDock || '-'}</td>
                        <td className="p-3 font-mono font-bold text-white">{row.packageCount ?? '-'}</td>
                        <td className="p-3 font-mono text-zinc-400">{row.iscaNumber || '-'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              row.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : row.status === 'at_dock'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : row.status === 'called'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COLAR RESPOSTAS DO FORMS / EXCEL */}
      {showPasteFormsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Colar do Google Forms / Excel</h3>
              </div>
              <button
                onClick={() => setShowPasteFormsModal(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Copie as linhas da planilha de respostas do Google Forms ou Excel e cole na caixa abaixo.
              <br />
              <strong className="text-emerald-300 font-mono">
                Nome do Motorista | Placa | Telefone | Rota | Cidade | Prioritário | Observações
              </strong>
            </p>

            <textarea
              rows={8}
              value={pastedFormsText}
              onChange={e => setPastedFormsText(e.target.value)}
              placeholder={`Exemplo de linhas:\nCarlos Alberto\tBRA2E19\t(61) 98765-4321\t01A\tGama - DF\tNão\tCarga normal\nRoberto Lima\tRIO4F22\t(61) 99123-5566\t16A\tCeilândia - DF\tSim\tPrioridade`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteFormsModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleParsePastedForms}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black cursor-pointer shadow-md"
              >
                Importar na Planilha do Forms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
