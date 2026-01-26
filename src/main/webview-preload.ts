import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronHost', {
    send: (channel: string, data: any) => {
        ipcRenderer.sendToHost(channel, data);
    }
});
