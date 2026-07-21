import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

interface I18nManifest {
  defaultLanguage: string;
  fallbackLanguage: string;
  supportedLanguages: string[];
  files: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly manifestPath = 'assets/i18n/main.json';
  private manifest: I18nManifest | null = null;

  private readonly languageSource = new BehaviorSubject<string>('es');
  readonly language$ = this.languageSource.asObservable();

  private translations: Record<string, unknown> = {};

  constructor(private http: HttpClient) {}

  async init(): Promise<void> {
    if (!this.manifest) {
      this.manifest = await firstValueFrom(this.http.get<I18nManifest>(this.manifestPath));
    }

    const storedLanguage = this.readStoredLanguage();
    const browserLanguage = this.getBrowserLanguage();
    const initialLanguage = this.resolveLanguage(storedLanguage || browserLanguage || this.manifest.defaultLanguage);

    await this.setLanguage(initialLanguage);
  }

  async setLanguage(language: string): Promise<void> {
    if (!this.manifest) {
      await this.init();
      return;
    }

    const resolvedLanguage = this.resolveLanguage(language);
    const filePath = this.manifest.files[resolvedLanguage] || this.manifest.files[this.manifest.fallbackLanguage];

    if (!filePath) {
      return;
    }

    this.translations = await firstValueFrom(this.http.get<Record<string, unknown>>(filePath));
    this.languageSource.next(resolvedLanguage);
    localStorage.setItem('app.language', resolvedLanguage);
  }

  getCurrentLanguage(): string {
    return this.languageSource.value;
  }

  t(key: string): string {
    if (!key) {
      return '';
    }

    const value = this.getValueByPath(this.translations, key);
    if (typeof value === 'string') {
      return value;
    }

    return key;
  }

  private resolveLanguage(language: string): string {
    const normalized = (language || '').toLowerCase();
    if (!this.manifest) {
      return normalized || 'es';
    }

    if (this.manifest.supportedLanguages.includes(normalized)) {
      return normalized;
    }

    return this.manifest.fallbackLanguage;
  }

  private readStoredLanguage(): string | null {
    try {
      return localStorage.getItem('app.language');
    } catch {
      return null;
    }
  }

  private getBrowserLanguage(): string {
    const lang = navigator.language || 'es';
    return lang.split('-')[0].toLowerCase();
  }

  private getValueByPath(source: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, segment) => {
      if (!acc || typeof acc !== 'object') {
        return undefined;
      }
      return (acc as Record<string, unknown>)[segment];
    }, source);
  }
}
