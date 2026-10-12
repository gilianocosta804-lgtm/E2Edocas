import React, { useState, useEffect } from 'react';
import {
  QrCode,
  X,
  Copy,
  Check,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeTotemModalProps {
  isOpen: boolean;
  onClose: () => void;
  customUrl?: string;
}

export const QRCodeTotemModal: React.FC<QRCodeTotemModalProps> = ({
  isOpen,
  onClose,
  customUrl,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);

  // Compute clean URL for drivers
  const targetUrl = React.useMemo(() => {
    if (customUrl) return customUrl;
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      // Ensure it directs to driver tab
      url.searchParams.set('tab', 'driver');
      return url.toString();
    } catch {
      return typeof window !== 'undefined' ? window.location.href : '';
    }
  }, [customUrl]);

  // Generate crisp QR code with ample quiet zone (margin: 4) so edges/corners are NEVER cut off
  useEffect(() => {
    if (!isOpen || !targetUrl) return;

    QRCode.toDataURL(targetUrl, {
      margin: 4, // ISO 18004 standard quiet zone
      width: 480, // High-DPI resolution
      color: {
        dark: '#0a0a0c',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => {
        console.error('Erro ao gerar QR Code:', err);
      });
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = 'E2E-DOCAS-QRCode-Motorista.png';
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Placa de Portaria - QR Code E2E - DOCAS</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px 20px;
              color: #111;
              background: #fff;
            }
            .border-box {
              border: 4px solid #111;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
              border-radius: 16px;
            }
            h1 { font-size: 28px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
            h2 { font-size: 18px; color: #444; font-weight: normal; margin-top: 0; }
            img { width: 340px; height: 340px; margin: 20px auto; display: block; }
            .steps { text-align: left; margin: 30px auto; max-width: 450px; font-size: 16px; line-height: 1.6; }
            .steps ol { padding-left: 20px; }
            .url { font-family: monospace; font-size: 13px; color: #555; word-break: break-all; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="border-box">
            <h1>🚚 E2E - DOCAS • Portaria</h1>
            <h2>Condomínio SYS Gama - Ponte Alta (Gama - DF)</h2>
            <img src="${qrCodeDataUrl}" alt="QR Code E2E - DOCAS" />
            <div class="steps">
              <ol>
                <li><strong>Aponte a câmera do seu celular</strong> para este QR Code</li>
                <li><strong>Ative a localização (GPS):</strong> o check-in só é validado a até 50 metros da base</li>
                <li><strong>Digite seu nome e placa</strong> para entrar na fila</li>
                <li><strong>Acompanhe no celular:</strong> você receberá um alarme sonoro com o número da sua doca</li>
              </ol>
            </div>
            <div class="url">${targetUrl}</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all ${
        isKioskMode ? 'bg-black p-0' : 'bg-black/85 backdrop-blur-md'
      }`}
    >
      <div
        className={`bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl text-zinc-100 flex flex-col transition-all overflow-hidden ${
          isKioskMode
            ? 'w-full h-full max-w-none rounded-none border-none justify-between p-8'
            : 'max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
              <QrCode className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight flex items-center gap-2">
                <span>QR Code para Celular dos Motoristas</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Visível &amp; Nítido
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Escaneie na guarita ou portaria para acessar o Portal do Motorista
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsKioskMode(!isKioskMode)}
              title={isKioskMode ? 'Sair do Modo Totem' : 'Modo Totem / Tela Cheia (Portaria)'}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              {isKioskMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QR Code Presentation Box (GUARANTEED NO CORNER CLIPPING) */}
        <div className="flex flex-col items-center justify-center py-2 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-2xl border-4 border-zinc-200 inline-flex flex-col items-center">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code E2E - DOCAS"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain block select-none"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center text-zinc-400 text-xs font-mono">
                Gerando QR Code...
              </div>
            )}
            <div className="mt-2 text-center text-zinc-900 font-mono text-[11px] font-bold tracking-wider uppercase">
              E2E - DOCAS • Aponte a Câmera
            </div>
          </div>

          {/* Quick instructions */}
          <div className="text-center max-w-sm space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Funciona em qualquer celular (Android / iOS)</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              O motorista entra na fila virtual e o celular toca um alarme alto quando a doca for chamada.
            </p>
          </div>
        </div>

        {/* Action Controls & URL Bar */}
        <div className="space-y-3 pt-2 border-t border-zinc-850">
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl p-2 text-xs">
            <span className="font-mono text-[11px] text-zinc-300 truncate flex-1 px-1">
              {targetUrl}
            </span>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 font-medium border border-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Imprimir Placa A4</span>
            </button>

            <button
              onClick={handleDownload}
              className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 font-medium border border-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Baixar Imagem</span>
            </button>

            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Portal</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
