import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import os from 'os';
import { terminalService } from './TerminalService';
import { WorkspaceStore } from './WorkspaceStore';
import { SettingsStore } from './SettingsStore';
import { BrowserWindow } from 'electron';

interface RemoteConnection {
    socket: any;
    workspaceId: string;
    token: string;
}

class RemoteService {
    private wss: WebSocketServer | null = null;
    private httpServer: any = null;
    private connections: Set<RemoteConnection> = new Set();
    private activeTokens: Map<string, string> = new Map(); // workspaceId -> token
    private port: number = 3001;
    private rendererUrl: string = '';

    public setRendererUrl(url: string): void {
        this.rendererUrl = url;
    }

    public start(): { port: number, ips: string[], rendererUrl: string } {
        const ips = this.getAllLocalIPs();
        if (this.wss) return { port: this.port, ips, rendererUrl: this.rendererUrl };

        this.httpServer = createServer((req, res) => {
            // Add CORS headers for mobile browser compatibility
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            // If in dev mode and we have a renderer URL, proxy the request
            if (this.rendererUrl) {
                const targetUrl = new URL(req.url || '/', this.rendererUrl);
                const proxyReq = (targetUrl.protocol === 'https:' ? require('https') : require('http')).request(targetUrl, (proxyRes: any) => {
                    // Merge CORS headers with proxy response headers
                    const headers = { ...proxyRes.headers };
                    headers['Access-Control-Allow-Origin'] = '*';
                    res.writeHead(proxyRes.statusCode, headers);
                    proxyRes.pipe(res, { end: true });
                });

                proxyReq.on('error', (err: any) => {
                    console.error('[Remote] Proxy error:', err.message);
                    res.writeHead(502);
                    res.end(`Proxy Error: ${err.message}`);
                });

                req.pipe(proxyReq, { end: true });
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('EnviroTerm Remote Server Active\n');
        });

        this.wss = new WebSocketServer({ server: this.httpServer, path: '/remote' });

        this.wss.on('connection', (ws: any, req: any) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            const workspaceId = url.searchParams.get('workspaceId');

            console.log(`[Remote] Connection attempt from ${req.socket.remoteAddress}`);
            console.log(`[Remote] Token received: ${token}, WorkspaceId: ${workspaceId}`);
            console.log(`[Remote] Expected token: ${this.activeTokens.get(workspaceId || '')}`);

            if (!token || !workspaceId) {
                console.warn(`[Remote] Missing token or workspaceId`);
                ws.close(4001, 'Unauthorized - missing credentials');
                return;
            }

            const expectedToken = this.activeTokens.get(workspaceId);
            if (!expectedToken) {
                console.warn(`[Remote] No active token for workspace: ${workspaceId}`);
                ws.close(4001, 'Unauthorized - no active session');
                return;
            }

            if (expectedToken !== token) {
                console.warn(`[Remote] Token mismatch. Expected: ${expectedToken}, Got: ${token}`);
                ws.close(4001, 'Unauthorized - invalid token');
                return;
            }

            const conn: RemoteConnection = { socket: ws, workspaceId, token };
            this.connections.add(conn);

            console.log(`[Remote] Mobile connected for workspace: ${workspaceId}`);

            ws.on('message', async (message: string) => {
                try {
                    const payload = JSON.parse(message.toString());
                    console.log(`[Remote] Received: ${payload.type} for session: ${payload.sessionId || payload.workspaceId}`);

                    if (payload.type === 'input' && payload.sessionId) {
                        terminalService.write(payload.sessionId, payload.data);
                    } else if (payload.type === 'getSessions' && payload.workspaceId) {
                        const sessions = WorkspaceStore.getSessionsByWorkspace(payload.workspaceId);
                        const allWorkspaces = WorkspaceStore.getWorkspaces();
                        console.log(`[Remote] Workspace requested: "${payload.workspaceId}"`);
                        console.log(`[Remote] All workspaces:`, allWorkspaces.map(w => ({ id: w.id, path: w.path })));
                        console.log(`[Remote] Found ${sessions.length} sessions for this workspace`);
                        ws.send(JSON.stringify({ type: 'sessions', sessions }));
                    } else if (payload.type === 'spawn' && payload.workspaceId && payload.sessionId) {
                        const path = payload.folderPath;
                        terminalService.spawn(payload.sessionId, path, payload.sessionName || 'Remote');
                    } else if (payload.type === 'resize' && payload.sessionId) {
                        terminalService.resize(payload.sessionId, payload.cols, payload.rows);
                    } else if (payload.type === 'syncSession' && payload.sessionId) {
                        const buffer = terminalService.getBuffer(payload.sessionId);
                        const dims = terminalService.getDimensions(payload.sessionId);
                        console.log(`[Remote] Syncing session ${payload.sessionId}: ${buffer.length} buffer chunks, dims: ${dims?.cols}x${dims?.rows}`);
                        ws.send(JSON.stringify({ type: 'history', sessionId: payload.sessionId, data: buffer, dims }));
                    } else if (payload.type === 'getSettings' && payload.workspaceId) {
                        const settings = SettingsStore.getAll(payload.workspaceId);
                        ws.send(JSON.stringify({ type: 'settings', settings }));
                    } else if (payload.type === 'paste' && payload.sessionId) {
                        console.log('[Remote] Paste received for session:', payload.sessionId, 'data keys:', Object.keys(payload.data || {}));
                        const mainWindow = BrowserWindow.getAllWindows()[0];
                        if (mainWindow) {
                            // Get the image shortcut from settings for this workspace
                            const settings = SettingsStore.getAll(workspaceId);
                            const imageShortcut = settings.imageShortcut || ['Alt', 'V'];

                            console.log('[Remote] Sending paste to renderer with imageShortcut:', imageShortcut);
                            mainWindow.webContents.send('terminal:remote-paste', {
                                sessionId: payload.sessionId,
                                data: payload.data,
                                imageShortcut
                            });
                        } else {
                            console.warn('[Remote] No main window found for paste');
                        }
                    } else if (payload.type === 'createSession' && payload.workspaceId) {
                        const workspace = WorkspaceStore.getWorkspaceById(payload.workspaceId);
                        if (!workspace) {
                            ws.send(JSON.stringify({ type: 'createSessionError', error: 'Workspace not found' }));
                            return;
                        }

                        const sessionName = payload.name || `Terminal ${WorkspaceStore.getSessionsByWorkspace(payload.workspaceId).length + 1}`;
                        const newSession = WorkspaceStore.createSession(payload.workspaceId, sessionName);

                        const initialCommand = SettingsStore.getInitialCommand(payload.workspaceId);
                        terminalService.spawn(newSession.id, workspace.path, sessionName, initialCommand);

                        // Notify mobile client
                        ws.send(JSON.stringify({ type: 'sessionCreated', session: newSession }));

                        const sessions = WorkspaceStore.getSessionsByWorkspace(payload.workspaceId);
                        ws.send(JSON.stringify({ type: 'sessions', sessions }));

                        // Notify desktop app to update its UI
                        const mainWindow = BrowserWindow.getAllWindows()[0];
                        if (mainWindow) {
                            mainWindow.webContents.send('sessions:created', newSession);
                        }
                    }
                } catch (e) {
                    console.error('[Remote] Failed to process message:', e);
                }
            });

            ws.on('close', (code: number, reason: Buffer) => {
                this.connections.delete(conn);
                console.log(`[Remote] Mobile disconnected. Code: ${code}, Reason: ${reason.toString()}`);
            });

            ws.on('error', (error: Error) => {
                console.error(`[Remote] WebSocket error:`, error);
            });

            // Send a welcome message to confirm connection is working
            ws.send(JSON.stringify({ type: 'connected', message: 'Connection established' }));
        });

        this.httpServer.listen(this.port, '0.0.0.0');
        console.log(`[Remote] Server started on port ${this.port}`);

        return { port: this.port, ips, rendererUrl: this.rendererUrl };
    }

    public generateToken(workspaceId: string): string {
        // Return existing token if one already exists (prevents invalidation on re-renders)
        const existingToken = this.activeTokens.get(workspaceId);
        if (existingToken) {
            console.log(`[Remote] Reusing existing token for workspace: ${workspaceId}`);
            return existingToken;
        }

        const token = Math.random().toString(36).substring(2, 10);
        this.activeTokens.set(workspaceId, token);
        console.log(`[Remote] Generated new token for workspace: ${workspaceId}`);
        return token;
    }

    public invalidateToken(workspaceId: string): void {
        this.activeTokens.delete(workspaceId);
        console.log(`[Remote] Invalidated token for workspace: ${workspaceId}`);
    }

    public broadcastDimensions(sessionId: string, cols: number, rows: number): void {
        const message = JSON.stringify({ type: 'dimensions', sessionId, cols, rows });
        for (const conn of this.connections) {
            conn.socket.send(message);
        }
    }

    public broadcast(sessionId: string, data: string): void {
        const message = JSON.stringify({ type: 'data', sessionId, data });
        for (const conn of this.connections) {
            conn.socket.send(message);
        }
    }

    public broadcastSettings(workspaceId: string): void {
        const settings = SettingsStore.getAll(workspaceId);
        const message = JSON.stringify({ type: 'settings', settings });
        for (const conn of this.connections) {
            if (conn.workspaceId === workspaceId) {
                conn.socket.send(message);
            }
        }
    }

    public stop(): void {
        this.wss?.close();
        this.httpServer?.close();
        this.wss = null;
        this.httpServer = null;
        this.connections.clear();
    }

    public getAllLocalIPs(): string[] {
        const interfaces = os.networkInterfaces();
        const ips: string[] = [];
        for (const devName in interfaces) {
            const iface = interfaces[devName];
            if (!iface) continue;
            for (let i = 0; i < iface.length; i++) {
                const alias = iface[i];
                if (alias.family === 'IPv4' && !alias.internal) {
                    ips.push(alias.address);
                }
            }
        }
        return ips.length > 0 ? ips : ['localhost'];
    }
}

export const remoteService = new RemoteService();
