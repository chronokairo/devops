import React, { useRef, useState, useEffect, useCallback } from "react";
import { MonitorSmartphone, RotateCcw, WifiOff } from "lucide-react";

const DISCORD_URL = "https://discord.com/channels/1364968917864288290";

/**
 * User-Agent do Chrome Mobile atualizado – faz o Discord renderizar
 * no modo mobile, ideal para a secondary sidebar estreita.
 */
const DISCORD_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/131.0.0.0 Mobile Safari/537.36";

/**
 * Detecta o ambiente Electron pela API exposta no preload (mais confiável
 * que checar o userAgent, que pode ser customizado).
 * Fallback para o userAgent para compatibilidade com builds sem preload.
 */
const isElectron = (): boolean =>
  window.electronAPI?.isElectron === true ||
  (typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("electron"));

const DiscordLogoSVG = ({
  size = 24,
  fill = "#5865F2",
}: {
  size?: number;
  fill?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 127.14 96.36"
    width={size}
    height={size}
    style={{ flexShrink: 0 }}
  >
    <path
      fill={fill}
      d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
    />
  </svg>
);

// ─── Electron webview client ───────────────────────────────────────────────

const DiscordWebview: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<HTMLElement>(null);

  const [crashed, setCrashed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sincroniza tamanho do webview com o container (o <webview> do Electron
  // não respeita height:100% de forma confiável).
  useEffect(() => {
    const container = containerRef.current;
    const wv = webviewRef.current;
    if (!container || !wv) return;

    const sync = () => {
      const { width, height } = container.getBoundingClientRect();
      wv.style.width  = `${width}px`;
      wv.style.height = `${height}px`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const online  = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online",  online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online",  online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  // ── Detectar tema do Discord e sincronizar com o app ──────────────
  useEffect(() => {
    const wv = webviewRef.current as any;
    if (!wv) return;

    let themeInterval: ReturnType<typeof setInterval> | null = null;

    const detectDiscordTheme = async () => {
      try {
        // Discord usa classe "theme-dark" ou "theme-light" no <html>
        const theme = await wv.executeJavaScript(
          `(function() {
            const html = document.documentElement;
            if (html.classList.contains('theme-dark')) return 'dark';
            if (html.classList.contains('theme-light')) return 'light';
            // fallback: checar atributo data-theme
            const dt = html.getAttribute('data-theme');
            if (dt === 'dark' || dt === 'light') return dt;
            // fallback: checar background color
            const bg = getComputedStyle(document.body).backgroundColor;
            const rgb = bg.match(/\\d+/g);
            if (rgb) {
              const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
              return brightness < 128 ? 'dark' : 'light';
            }
            return 'dark';
          })()`
        );
        if (theme === 'dark' || theme === 'light') {
          window.dispatchEvent(
            new CustomEvent('discord-theme-change', { detail: { theme } })
          );
        }
      } catch {
        // webview pode não estar pronto ainda
      }
    };

    const onDomReady = () => {
      // Detecta o tema inicial após um pequeno delay para o Discord renderizar
      setTimeout(detectDiscordTheme, 2000);
      // Faz polling periódico para detectar mudanças de tema
      themeInterval = setInterval(detectDiscordTheme, 10000);
    };

    wv.addEventListener('dom-ready', onDomReady);

    return () => {
      wv.removeEventListener('dom-ready', onDomReady);
      if (themeInterval) clearInterval(themeInterval);
    };
  }, []);

  useEffect(() => {
    const wv = webviewRef.current as any;
    if (!wv) return;

    const onCrash = () => setCrashed(true);
    wv.addEventListener("crashed",             onCrash);
    wv.addEventListener("render-process-gone", onCrash);
    wv.addEventListener("new-window", (e: any) => {
      e.preventDefault?.();
      window.electronAPI?.openExternal(e.url);
    });

    return () => {
      wv.removeEventListener("crashed",             onCrash);
      wv.removeEventListener("render-process-gone", onCrash);
    };
  }, []);

  const handleReload = useCallback(() => {
    setCrashed(false);
    (webviewRef.current as any)?.reload?.();
  }, []);

  const DISCORD_BLUE = "#5865F2";

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Overlay: sem conexão */}
      {!isOnline && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/95">
          <WifiOff size={48} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sem conexão com a internet</p>
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
          >
            <RotateCcw size={14} />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Overlay: crashed */}
      {crashed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/95">
          <p className="text-base font-bold text-destructive">O Discord parou de responder</p>
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors"
            style={{ backgroundColor: DISCORD_BLUE }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#4752c4")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = DISCORD_BLUE)}
          >
            <RotateCcw size={14} />
            Recarregar
          </button>
        </div>
      )}

      {/* @ts-ignore — <webview> é exclusivo do Electron */}
      <webview
        ref={webviewRef}
        src={DISCORD_URL}
        partition="persist:discord"
        useragent={DISCORD_UA}
        allowpopups={true as any}
        // @ts-ignore — atributos Electron extras
        enableblinkfeatures="GetUserMedia,MediaStreamTrack"
        // @ts-ignore
        disablewebsecurity={false}
        style={{
          display: "inline-flex",
          border: "none",
          visibility: crashed ? "hidden" : "visible",
        }}
      />
    </div>
  );
};

// ─── Browser fallback (not Electron) ──────────────────────────────────────

const DiscordBrowserFallback: React.FC = () => (
  <div
    className="w-full h-full flex flex-col items-center justify-center gap-8 p-6"
    style={{
      background: "var(--discord-bg, #1e1f22)",
      backgroundImage: "radial-gradient(ellipse at 50% 40%, rgba(88,101,242,0.12) 0%, transparent 65%)",
    }}
  >
    {/* Logo */}
    <div className="flex flex-col items-center gap-3">
      <DiscordLogoSVG size={96} />
      <h2 className="text-3xl font-extrabold tracking-tight">Discord</h2>
      <p className="text-sm text-muted-foreground text-center max-w-[440px]">
        O cliente Discord integrado está disponível no{" "}
        <strong>app desktop</strong> (Electron). No browser, acesse o Discord
        diretamente pelo botão abaixo.
      </p>
    </div>

    {/* Botões */}
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold text-white rounded-lg transition-colors"
        style={{ backgroundColor: "#5865F2" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#4752c4")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#5865F2")}
      >
        <DiscordLogoSVG size={18} fill="#fff" />
        Abrir Discord no browser
      </a>

      <a
        href="https://discord.com/download"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-lg border transition-colors hover:bg-[rgba(88,101,242,0.06)]"
        style={{ borderColor: "rgba(88,101,242,0.5)", color: "#5865F2" }}
      >
        <MonitorSmartphone size={18} />
        Baixar app desktop
      </a>
    </div>

    {/* Dica */}
    <div className="flex items-center gap-1.5 opacity-60">
      <MonitorSmartphone size={14} className="text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        Abra o ThinkTrack via AppImage ou Electron para acesso completo integrado
      </span>
    </div>
  </div>
);

// ─── Entry point ───────────────────────────────────────────────────────────

const DiscordChat: React.FC = () =>
  isElectron() ? <DiscordWebview /> : <DiscordBrowserFallback />;

export default DiscordChat;
