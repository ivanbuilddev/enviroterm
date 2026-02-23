import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export function registerFileSystemHandlers() {
  ipcMain.handle('files:readDir', async (_, dirPath: string) => {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      return items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.join(dirPath, item.name)
      })).sort((a, b) => {
        // Folders first, then files
        if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
      });
    } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
    }
  });

  ipcMain.handle('files:readFile', async (_, filePath: string) => {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  });

  ipcMain.handle('files:writeFile', async (_, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  });

  ipcMain.handle('files:search', async (_, rootPath: string, query: string) => {
    const results: { name: string; isDirectory: boolean; path: string }[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Helper function for recursive search
    async function searchRecursive(currentPath: string) {
      if (results.length > 500) return; // Limit results for performance

      try {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          // Skip heavy directories for performance
          if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' || item.name === 'build') {
            continue;
          }

          const fullPath = path.join(currentPath, item.name);
          const isMatch = item.name.toLowerCase().includes(lowerQuery);

          if (isMatch) {
            results.push({
              name: item.name,
              isDirectory: item.isDirectory(),
              path: fullPath
            });
          }

          // If directory, recurse into it
          if (item.isDirectory()) {
            await searchRecursive(fullPath);
          }
        }
      } catch (error) {
        // Ignore errors (permission denied, etc.)
      }
    }

    if (!query) return [];
    await searchRecursive(rootPath);
    
    // Sort results: Folders first, then files
    return results.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
    });
  });
}
