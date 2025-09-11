// src/app/core/loading.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  loading = signal(false);
  start() { if (++this.count === 1) this.loading.set(true); }
  stop()  { if (this.count && --this.count === 0) this.loading.set(false); }
}
