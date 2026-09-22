import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import type { McpBridge, BridgeStatus } from '@/mcp/useMcpBridge';

interface McpBridgeStatusProps {
  bridge: McpBridge;
}

const STATUS_LABELS: Record<BridgeStatus, string> = {
  idle: 'Puente MCP: inactivo',
  connecting: 'Puente MCP: esperando al servidor…',
  connected: 'Puente MCP: conectado',
  unavailable: 'Puente MCP: no disponible en esta página',
  error: 'Puente MCP: error'
};

const STATUS_DOTS: Record<BridgeStatus, string> = {
  idle: 'bg-github-muted',
  connecting: 'bg-github-purple animate-pulse',
  connected: 'bg-github-green',
  unavailable: 'bg-yellow-500',
  error: 'bg-red-500'
};

const portOf = (url: string): string => url.split(':').pop() || '8765';

const clientConfig = (port: string) => `{
  "mcpServers": {
    "presen-timer": {
      "command": "node",
      "args": ["/ruta/absoluta/a/presen-timer/mcp/server.mjs", "--port", "${port}"]
    }
  }
}`;

const McpBridgeStatus = ({ bridge }: McpBridgeStatusProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const port = portOf(bridge.url);
  const config = clientConfig(port);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed bottom-14 left-4 z-50 max-w-[min(28rem,calc(100vw-2rem))]">
      {open && (
        <div className="mb-2 rounded-lg border border-github-subtle bg-github-dark/95 backdrop-blur-md p-4 text-sm text-github-text shadow-lg">
          {bridge.status === 'unavailable' ? (
            <p className="text-github-muted">
              {bridge.lastError ??
                'Esta página no puede hablar con el puente local. Abre la app en http://localhost:8080/presen-timer/.'}
            </p>
          ) : (
            <>
              <p className="text-github-muted mb-3">
                El puente vive solo mientras este proceso y esta pestaña estén abiertos. Escucha en
                <span className="text-github-light"> {bridge.url}</span> (solo tu máquina, sin tokens ni
                servidores en la nube).
              </p>

              <p className="mb-1 text-github-light font-medium">Arranca el servidor MCP</p>
              <p className="mb-2 text-xs text-github-muted">
                Ejecuta esto en una terminal del repositorio:
              </p>
              <pre className="mb-3 overflow-x-auto rounded bg-github-darker p-2 text-xs text-github-text">
{`npm install
npm run dev     # abre http://localhost:8080/presen-timer/
npm run mcp     # --port ${port} si lo cambias`}
              </pre>

              <p className="mb-1 text-github-light font-medium">Configura tu cliente MCP</p>
              <p className="mb-2 text-xs text-github-muted">
                Si usas Claude Code, Copilot CLI o Cursor, añade esto a su configuración para que
                arranque el servidor automáticamente (no necesitas el paso anterior):
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded bg-github-darker p-2 pr-10 text-xs text-github-text">
{config}
                </pre>
                <button
                  type="button"
                  onClick={copy}
                  aria-label="Copiar la configuración del cliente MCP"
                  className="absolute right-1 top-1 rounded p-1 text-github-muted hover:text-github-light transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-github-muted">
                {copied ? 'Copiado al portapapeles.' : 'Sustituye la ruta por la de este repositorio.'}
              </p>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-github-subtle bg-github-dark/90 px-3 py-1 text-xs text-github-text backdrop-blur-md hover:border-github-purple transition-colors"
      >
        <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[bridge.status]}`} aria-hidden="true" />
        <span>{STATUS_LABELS[bridge.status]}</span>
        {bridge.status === 'connected' && bridge.sessionId && (
          <span className="text-github-muted">· {bridge.sessionId.slice(0, 8)}</span>
        )}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
};

export default McpBridgeStatus;
