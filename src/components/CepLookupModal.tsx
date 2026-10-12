import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  X,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Building2,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import { CepResult } from '../types';
import { consultCep } from '../services/api';

interface CepLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Preset CEPs exclusively for exact address query (no route numbers)
const PRESET_CEPS = [
  { label: 'Ceilândia - DF', cep: '72210-000' },
  { label: 'Gama - DF', cep: '72405-610' },
  { label: 'Taguatinga - DF', cep: '72010-010' },
  { label: 'Samambaia - DF', cep: '72318-535' },
  { label: 'Plano Piloto - DF', cep: '70040-010' },
  { label: 'Santa Maria - DF', cep: '72580-900' },
  { label: 'Águas Claras - DF', cep: '71900-100' },
  { label: 'Valparaíso de Goiás - GO', cep: '72870-615' },
  { label: 'Novo Gama - GO', cep: '72867-025' },
  { label: 'Águas Lindas de Goiás - GO', cep: '72911-680' },
  { label: 'Luziânia - GO', cep: '72812-386' },
];

export const CepLookupModal: React.FC<CepLookupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [cepInput, setCepInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CepResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<CepResult[]>(() => {
    try {
      const saved = localStorage.getItem('e2e_cep_history_exact');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (history.length > 0) {
      try {
        localStorage.setItem('e2e_cep_history_exact', JSON.stringify(history.slice(0, 10)));
      } catch (e) {
        console.warn('Erro ao salvar histórico de CEP:', e);
      }
    }
  }, [history]);

  if (!isOpen) return null;

  const formatCepInput = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    if (raw.length > 5) {
      return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    return raw;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCepInput(e.target.value);
    setCepInput(formatted);
    setError(null);

    // Auto-search if 8 numeric digits entered
    const cleanDigits = formatted.replace(/\D/g, '');
    if (cleanDigits.length === 8) {
      executeSearch(cleanDigits);
    }
  };

  const executeSearch = async (rawCep: string) => {
    const clean = rawCep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setError('Informe um CEP válido com exatamente 8 dígitos numéricos.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await consultCep(clean);
      setResult(res);
      setHistory(prev => {
        const filtered = prev.filter(item => item.cep.replace(/\D/g, '') !== clean);
        return [res, ...filtered].slice(0, 10);
      });
    } catch (err: any) {
      setError(err.message || 'CEP não encontrado na base oficial dos Correios.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(cepInput);
  };

  const handleSelectPreset = (presetCep: string) => {
    setCepInput(presetCep);
    executeSearch(presetCep);
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatFullAddress = (r: CepResult) => {
    const parts = [
      r.logradouro ? r.logradouro : null,
      r.bairro ? `Bairro ${r.bairro}` : null,
      r.localidade ? `${r.localidade} - ${r.uf}` : null,
      `CEP ${r.cep}`,
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-zinc-100 overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-md">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Consulta Exata de CEP</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  Base Oficial Correios
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Localização exata de logradouro, bairro, cidade e estado via ViaCEP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* SEARCH FORM */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-semibold text-zinc-300">
              Digite o CEP exato (8 dígitos):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={cepInput}
                  onChange={handleInputChange}
                  placeholder="Ex: 72210-000 ou 72405610"
                  maxLength={9}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base sm:text-lg font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                {cepInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCepInput('');
                      setResult(null);
                      setError(null);
                    }}
                    className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !cepInput.trim()}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-lg shadow-emerald-600/30"
              >
                {loading ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Buscar CEP</span>
              </button>
            </div>
          </form>

          {/* PRESET QUICK BUTTONS (WITHOUT ROUTE NUMBERS) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Atalhos de CEPs frequentes:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CEPS.map(p => (
                <button
                  key={p.cep}
                  type="button"
                  onClick={() => handleSelectPreset(p.cep)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{p.cep}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold">CEP Não Localizado</p>
                <p className="text-rose-400/90">{error}</p>
              </div>
            </div>
          )}

          {/* EXACT RESULT CARD */}
          {result && (
            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-750 p-5 space-y-4 shadow-xl animate-in fade-in">
              {/* TOP: CONFIRMED EXACT BADGE */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Endereço Oficial Confirmado
                    </span>
                    <h4 className="text-base font-bold font-mono text-white">
                      CEP: {result.cep}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(result.cep, 'cep_only')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-zinc-750 flex items-center gap-1.5 transition-colors"
                >
                  {copiedField === 'cep_only' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>{copiedField === 'cep_only' ? 'Copiado' : 'Copiar CEP'}</span>
                </button>
              </div>

              {/* EXACT ADDRESS DETAILS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Logradouro / Rua
                  </span>
                  <p className="font-bold text-zinc-100 text-sm">
                    {result.logradouro || 'Endereço Geral do Bairro'}
                  </p>
                  {result.complemento && (
                    <p className="text-[11px] text-zinc-400">{result.complemento}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Bairro</span>
                  <p className="font-bold text-zinc-100 text-sm">
                    {result.bairro || 'Centro / Distrito'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Cidade / Município &amp; UF
                  </span>
                  <p className="font-bold text-zinc-100 text-sm">
                    {result.localidade} - {result.uf}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Dados Regionais
                  </span>
                  <p className="font-mono text-zinc-200 text-xs">
                    DDD: {result.ddd || '61'} &bull; IBGE: {result.ibge || '5300108'}
                  </p>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => copyToClipboard(formatFullAddress(result), 'full_address')}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedField === 'full_address' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedField === 'full_address' ? 'Copiado para transferência!' : 'Copiar Endereço Completo'}
                  </span>
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${result.logradouro || ''} ${result.bairro || ''} ${result.localidade} ${result.uf} ${result.cep}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1.5 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ver no Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </div>
            </div>
          )}

          {/* RECENT SEARCHES HISTORY (WITHOUT ROUTE NUMBERS) */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-850">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Histórico de CEPs consultados recentemente:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('e2e_cep_history_exact');
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  Limpar
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {history.map((item, idx) => (
                  <div
                    key={`${item.cep}-${idx}`}
                    onClick={() => {
                      setResult(item);
                      setCepInput(item.cep);
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-emerald-400">{item.cep}</span>
                      <span className="text-zinc-400 truncate">
                        {item.logradouro ? `${item.logradouro}, ` : ''}
                        {item.bairro ? `${item.bairro} - ` : ''}
                        {item.localidade}/{item.uf}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
          <span>Consulta oficial e exata via ViaCEP / Correios</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
