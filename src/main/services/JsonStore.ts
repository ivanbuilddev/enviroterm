import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export class JsonStore<T extends Record<string, any>> {
    private filePath: string;
    private data: T;

    constructor(filename: string, defaults: T) {
        const userDataPath = app.getPath('userData');
        const storageDir = path.join(userDataPath, 'storage');

        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        this.filePath = path.join(storageDir, filename);
        this.data = this.load(defaults);
    }

    private load(defaults: T): T {
        try {
            if (fs.existsSync(this.filePath)) {
                const content = fs.readFileSync(this.filePath, 'utf-8');
                return { ...defaults, ...JSON.parse(content) };
            }
        } catch (error) {
            console.error(`Error loading store ${this.filePath}:`, error);
        }
        return defaults;
    }

    private save(): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (error) {
            console.error(`Error saving store ${this.filePath}:`, error);
        }
    }

    get<K extends keyof T>(key: K): T[K] {
        return this.data[key];
    }

    set<K extends keyof T>(key: K, value: T[K]): void {
        this.data[key] = value;
        this.save();
    }

    has(key: string): boolean {
        return key in this.data;
    }

    delete(key: keyof T): void {
        delete this.data[key];
        this.save();
    }

    clear(): void {
        this.data = {} as T;
        this.save();
    }

    getAll(): T {
        return { ...this.data };
    }
}
