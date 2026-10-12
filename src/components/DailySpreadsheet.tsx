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
} from 'lucide-react';
import { DailySheetSummary, DriverCheckIn } from '../types';
import { fetchCheckIns, fetchDailySheetsSummary, resetTodayQueue, syncMasterGoogle } from '../services/api';

interface DailySpreadsheetProps {
  currentCheckIns: DriverCheckIn[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export const DailySpreadsheet: React.FC<DailySpreadsheetProps> = ({
  currentCheckIns,
  onRefresh,
  isAdmin,
}) => {
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

  // Load sheets summary list
  useEffect(() => {
    fetchDailySheetsSummary()
      .then(res => setSummaries(res))
      .catch(console.error);
  }, [currentCheckIns.length]);

  // When date changes or currentCheckIns changes
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
  }, [selectedDate, currentCheckIns]);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Acesso Restrito à Planilha</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Esta planilha de controle em tempo real é restrita exclusivamente aos usuários Administrativos e ao Usuário Master. Colaboradores de doca registram a conferência diretamente no painel operacional.
        </p>
      </div>
    );
  }

  // Filtered rows
  const filteredRows = sheetData
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

  // Metrics for active sheet
  const totalRows = sheetData.length;
  const completedRows = sheetData.filter(r => r.status === 'completed').length;
  const priorityRows = sheetData.filter(r => r.isPriority).length;
  const totalPackages = sheetData.reduce((acc, r) => acc + (r.packageCount || 0), 0);
  const iscasCount = sheetData.filter(r => Boolean(r.iscaNumber)).length;

  const handleDownloadCsv = () => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Planilha de Controle em Tempo Real
              </h2>
              {selectedDate === todayDate ? (
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Hoje &bull; Ao Vivo
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  Histórico
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Preenchida automaticamente pelas coletas nas docas &bull; Acesso exclusivo para os administradores
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date Picker Selector */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-zinc-100 focus:outline-none font-mono"
            />
          </div>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors"
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
              <span className="font-medium text-white">
                Conta Google Master Conectada:
              </span>
              <span className="font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                gilianocosta804@gmail.com
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Planilhas e formulários são criados no login principal e preenchidos em tempo real pelas docas.
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            Total Check-ins
          </div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">{totalRows}</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-zinc-400" />
            <span>Pacotes Carregados</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">{totalPackages} un</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Tag className="w-3 h-3 text-zinc-400" />
            <span>Iscas Utilizadas</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">{iscasCount}</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
          <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
            Concluídos / Liberados
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{completedRows}</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
            Prioridades
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{priorityRows}</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            placeholder="Buscar por motorista, placa, rota, doca, isca..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-2 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="waiting">Apenas Aguardando</option>
            <option value="called">Apenas Chamando</option>
            <option value="at_dock">Apenas Na Doca</option>
            <option value="completed">Apenas Concluídos</option>
            <option value="absent">Apenas Ausentes</option>
          </select>

          <button
            onClick={() => setPriorityFilter(priorityFilter === 'all' ? true : 'all')}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              priorityFilter === true
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            <span>Prioridades</span>
          </button>
        </div>
      </div>

      {/* SPREADSHEET TABLE */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800 sticky top-0">
              <tr>
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3 min-w-[150px]">Motorista</th>
                <th className="p-3 min-w-[90px]">Placa</th>
                <th className="p-3 min-w-[140px]">Rota</th>
                <th className="p-3 min-w-[120px]">Cidade</th>
                <th className="p-3 min-w-[80px]">Chegada</th>
                <th className="p-3 min-w-[90px]">Prioridade</th>
                <th className="p-3 min-w-[80px]">Doca</th>
                <th className="p-3 min-w-[110px]">Pacotes</th>
                <th className="p-3 min-w-[110px]">Número da Isca</th>
                <th className="p-3 min-w-[130px]">Conferente</th>
                <th className="p-3 min-w-[130px]">Localização GPS</th>
                <th className="p-3 min-w-[90px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Carregando planilha...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-zinc-500">
                    Nenhum registro encontrado nesta planilha.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isOutside = row.locationStatus === 'outside_base';
                  const isPriority = row.isPriority;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-zinc-900/60 transition-colors ${
                        idx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/20'
                      }`}
                    >
                      {/* TICKET # */}
                      <td className="p-3 font-mono font-bold text-zinc-300 text-center">
                        {String(row.ticketNumber).padStart(3, '0')}
                      </td>

                      {/* DRIVER NAME */}
                      <td className="p-3 font-medium text-white">
                        {row.driverName}
                      </td>

                      {/* PLATE */}
                      <td className="p-3 font-mono text-zinc-300">
                        {row.licensePlate || '-'}
                      </td>

                      {/* ROUTE */}
                      <td className="p-3">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-850 border border-zinc-800 font-mono font-bold text-amber-300 text-xs">
                          {row.route}
                        </span>
                      </td>

                      {/* CITY */}
                      <td className="p-3 text-zinc-300">{row.city}</td>

                      {/* ARRIVAL TIME */}
                      <td className="p-3 font-mono text-zinc-300 text-[11px]">
                        {row.arrivalTime}
                      </td>

                      {/* PRIORITY (CLEAN SIM / NORMAL) */}
                      <td className="p-3">
                        {isPriority ? (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-semibold">
                            SIM
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Normal</span>
                        )}
                      </td>

                      {/* DOCK */}
                      <td className="p-3 font-mono font-medium text-zinc-200">
                        {row.assignedDock || '-'}
                      </td>

                      {/* PACOTES (QUANTIDADE CARREGADA) */}
                      <td className="p-3 font-mono">
                        {row.packageCount !== null && row.packageCount !== undefined ? (
                          <span className="font-semibold text-zinc-100 flex items-center gap-1">
                            <Package className="w-3 h-3 text-zinc-400" />
                            {row.packageCount} un
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* NÚMERO DA ISCA */}
                      <td className="p-3 font-mono">
                        {row.iscaNumber ? (
                          <span className="text-zinc-200 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-zinc-500" />
                            {row.iscaNumber}
                          </span>
                        ) : (
                          <span className="text-zinc-600">Não utilizada</span>
                        )}
                      </td>

                      {/* CONFERENTE / DOCA */}
                      <td className="p-3 text-[11px]">
                        {row.collectorName ? (
                          <div>
                            <div className="text-zinc-200">{row.collectorName}</div>
                            {row.collectorDock && (
                              <div className="text-zinc-500 text-[10px] font-mono">
                                {row.collectorDock}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* GPS STATUS */}
                      <td className="p-3 text-[11px]">
                        {row.locationStatus === 'validated_base' ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Na Base ({row.distanceToBaseMeters}m)
                          </span>
                        ) : isOutside ? (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Fora ({( (row.distanceToBaseMeters || 0) / 1000).toFixed(1)}km)
                          </span>
                        ) : (
                          <span className="text-zinc-500">Sem GPS</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                            row.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : row.status === 'at_dock'
                              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                              : row.status === 'called'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-850'
                          }`}
                        >
                          {row.status === 'completed'
                            ? 'Liberado'
                            : row.status === 'at_dock'
                            ? 'Na Doca'
                            : row.status === 'called'
                            ? 'Chamado'
                            : 'Aguardando'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
