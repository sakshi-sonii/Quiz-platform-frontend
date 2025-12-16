// Mock storage API for local development
interface StorageResult {
  key: string;
  value?: string;
  shared: boolean;
  deleted?: boolean;
}

interface ListResult {
  keys: string[];
  prefix?: string;
  shared: boolean;
}

interface Storage {
  get(key: string, shared?: boolean): Promise<StorageResult | null>;
  set(key: string, value: string, shared?: boolean): Promise<StorageResult | null>;
  delete(key: string, shared?: boolean): Promise<StorageResult | null>;
  list(prefix?: string, shared?: boolean): Promise<ListResult | null>;
}

(window as any).storage = {
  async get(key: string): Promise<StorageResult | null> {
    try {
      const value = localStorage.getItem(key);
      return value ? { key, value, shared: false } : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  
  async set(key: string, value: string): Promise<StorageResult | null> {
    try {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    } catch (error) {
      console.error('Storage set error:', error);
      return null;
    }
  },
  
  async delete(key: string): Promise<StorageResult | null> {
    try {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    } catch (error) {
      console.error('Storage delete error:', error);
      return null;
    }
  },
  
  async list(prefix: string = ''): Promise<ListResult | null> {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      return { keys, prefix, shared: false };
    } catch (error) {
      console.error('Storage list error:', error);
      return { keys: [], prefix, shared: false };
    }
  }
} as Storage;

// Add type declaration
declare global {
  interface Window {
    storage: Storage;
  }
}

export {};