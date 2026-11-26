import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, QrCode, X } from 'lucide-react';

interface ShareModalProps {
  shareUrl: string;
  onClose: () => void;
}

export function ShareModal({ shareUrl, onClose }: ShareModalProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(shareUrl, {
      type: 'svg',
      margin: 1,
      width: 210,
      color: {
        dark: '#1C2420',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (!cancelled) setSvgMarkup(svg);
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup('');
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Partilhar ementa e lista de compras com parceiro"
      data-testid="share-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1C2420]/60 p-4 backdrop-blur-xs sm:items-center"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F2EC] text-[#2F6F4E]">
              <QrCode className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1C2420]">
                Partilhar com Parceiro
              </h2>
              <p className="text-[11px] text-[#5C6862]">
                Sincronização instantânea offline — sem conta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de partilha"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2EFE9] text-[#5C6862] hover:text-[#1C2420]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-4 flex flex-col items-center justify-center rounded-2xl bg-[#FAF8F5] p-4">
          {svgMarkup ? (
            <div
              data-testid="share-qr-svg"
              className="overflow-hidden rounded-xl bg-white p-2 shadow-xs"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="flex h-[210px] w-[210px] items-center justify-center text-xs text-[#5C6862]">
              A gerar código QR…
            </div>
          )}
          <p className="mt-2.5 text-center text-[11px] text-[#5C6862]">
            Leia com a câmara do telemóvel do seu parceiro para carregar exatamente esta ementa e lista de compras.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            data-testid="copy-share-link-btn"
            onClick={handleCopy}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2F6F4E] px-4 text-sm font-bold text-white transition-colors hover:bg-[#25593E]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Link Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar Link de Partilha
              </>
            )}
          </button>

          <p className="truncate rounded-xl bg-[#F2EFE9] px-3 py-2 text-[10px] font-mono text-[#5C6862]">
            {shareUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
