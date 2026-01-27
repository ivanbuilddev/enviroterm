import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Wifi, ShieldCheck, ChevronDown } from 'lucide-react';

interface RemoteQRCodeModalProps {
    workspaceId: string;
    workspacePath: string;
    onClose: () => void;
}

export function RemoteQRCodeModal({ workspaceId, workspacePath, onClose }: RemoteQRCodeModalProps) {
    const [details, setDetails] = useState<{ port: number; ips: string[]; token: string; rendererUrl: string } | null>(null);
    const [selectedIp, setSelectedIp] = useState<string>('');

    useEffect(() => {
        let cancelled = false;

        const fetchDetails = async () => {
            const { port, ips, rendererUrl } = await window.electronAPI.remote.getDetails();
            const token = await window.electronAPI.remote.generateToken(workspaceId);

            // Prevent state update if effect was cleaned up (avoids race condition on remount)
            if (cancelled) return;

            setDetails({ port, ips, token, rendererUrl });
            if (ips && ips.length > 0) {
                setSelectedIp(ips[0]);
            } else {
                setSelectedIp('localhost');
            }
        };
        fetchDetails();

        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    if (!details || !selectedIp) return null;

    // Construct the remote URL
    // We always use the RemoteService port (3001) now because it proxies the UI
    const baseUrl = `http://${selectedIp}:${details.port}/`;

    // Ensure it's a valid URL and append parameters
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set('token', details.token);
    urlObj.searchParams.set('workspaceId', workspaceId);
    urlObj.searchParams.set('wsPort', details.port.toString()); // Tell mobile which port to use for WS

    const url = urlObj.toString();

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-bg-surface border border-border-strong w-[400px] shadow-2xl relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header decor */}
                <div className="h-1 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 hover:bg-bg-hover text-fg-muted hover:text-fg-primary transition-colors cursor-pointer"
                >
                    <X size={18} />
                </button>

                <div className="p-8 flex flex-col items-center">
                    <div className="mb-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-4">
                            <Smartphone size={24} />
                        </div>
                        <h2 className="text-lg font-header text-fg-primary mb-1">Send to Phone</h2>
                        <p className="text-[12px] text-fg-muted px-4">
                            Scan this code with your phone to control terminals in
                            <span className="text-fg-primary font-medium block mt-1">{workspacePath.split(/[/\\]/).pop()}</span>
                        </p>
                    </div>

                    <div className="p-4 bg-white shadow-inner mb-4">
                        <QRCodeSVG value={url} size={200} level="H" />
                    </div>

                    <div className="w-full mb-6">
                        <p className="text-[10px] text-fg-muted uppercase tracking-wider font-bold mb-2 ml-1 text-center font-header">Select Network Interface</p>
                        <div className="relative">
                            <select
                                value={selectedIp}
                                onChange={(e) => setSelectedIp(e.target.value)}
                                className="w-full bg-bg-elevated border border-border text-fg-primary text-[12px] pl-3 pr-10 py-2 outline-none hover:bg-bg-hover hover:border-border-strong focus:border-accent-primary transition-colors cursor-pointer appearance-none"
                            >
                                {details.ips.map(ip => (
                                    <option key={ip} value={ip}>{ip}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                        <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated/50 border border-border">
                            <Wifi size={16} className="text-accent-primary" />
                            <div className="flex-1">
                                <p className="text-[10px] text-fg-muted uppercase tracking-wider font-bold">Network</p>
                                <p className="text-[12px] text-fg-primary">Same Wi-Fi required</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated/50 border border-border">
                            <ShieldCheck size={16} className="text-status-success" />
                            <div className="flex-1">
                                <p className="text-[10px] text-fg-muted uppercase tracking-wider font-bold">Security</p>
                                <p className="text-[12px] text-fg-primary">Temporary private connection</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-8 text-[10px] text-fg-faint text-center">
                        URL: {url}
                    </p>
                </div>
            </div>
        </div>
    );
}
