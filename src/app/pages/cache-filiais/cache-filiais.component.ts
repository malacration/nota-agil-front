import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { COMMON, INPUTS, TABLE } from '@/modules';
import { CacheFiliais, EntradaCacheFiliais, PerfilService } from '@/_service/perfil.service';

/** Admin: filiais de cada operador em cache (por ERP) e invalidacao, geral ou por usuario. */
@Component({
  selector: 'app-cache-filiais',
  standalone: true,
  imports: [...COMMON, ...INPUTS, ...TABLE],
  template: `
    @if (erro) { <div class="card text-red-600" role="alert">{{ erro }}</div> }
    @if (sucesso) { <div class="card text-green-600" role="status">{{ sucesso }}</div> }
    <div class="card">
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="font-semibold text-xl">Cache de filiais por usuário</div>
        <div class="flex gap-2">
          <p-button label="Atualizar" icon="pi pi-refresh" severity="secondary" [loading]="carregando" (onClick)="carregar()" />
          <p-button label="Invalidar tudo" icon="pi pi-trash" severity="danger" [disabled]="invalidando" (onClick)="invalidarTudo()" />
        </div>
      </div>
      <p class="text-600 mb-3">
        As filiais que cada operador pode usar vêm do SAP (filiais do colaborador/vendedor) e do Dealer (empresas das roles)
        e ficam em cache por {{ ttlLegivel }}. Invalide depois de mudar o acesso de alguém no SAP, no Dealer ou no SSO.
        "Invalidar tudo" também recarrega o mapa de filial → CNPJ de cada ERP. O logout do usuário limpa o cache dele.
      </p>
      <p-table [value]="cache?.entradas ?? []" [loading]="carregando" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr><th>Usuário</th><th>ERP</th><th>Filiais</th><th>Carregado em</th><th>Expira em</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td>{{ e.login }}</td>
            <td><p-tag [value]="e.erp === 'SAP' ? 'SAP' : 'Dealer'" severity="info" /></td>
            <td>{{ e.filiais }}</td>
            <td>{{ e.carregadoEm | date: 'dd/MM/yyyy HH:mm' }}</td>
            <td>{{ e.expiraEm | date: 'dd/MM/yyyy HH:mm' }}</td>
            <td class="text-right">
              <p-button label="Invalidar usuário" icon="pi pi-times" severity="secondary" [outlined]="true" size="small"
                [disabled]="invalidando" (onClick)="invalidarUsuario(e)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center text-600 py-4">Nenhum usuário com filiais em cache.</td></tr>
        </ng-template>
      </p-table>
    </div>`
})
export class CacheFiliaisComponent implements OnInit {
  cache: CacheFiliais | null = null;
  carregando = false;
  invalidando = false;
  erro = '';
  sucesso = '';

  constructor(private perfil: PerfilService) {}

  ngOnInit(): void {
    this.carregar();
  }

  get ttlLegivel(): string {
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(this.cache?.ttl ?? '');
    if (!m) return this.cache?.ttl ?? '-';
    return [m[1] ? `${m[1]} h` : '', m[2] ? `${m[2]} min` : ''].filter(Boolean).join(' ') || this.cache!.ttl;
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.perfil.cacheFiliais().pipe(finalize(() => (this.carregando = false))).subscribe({
      next: (c) => (this.cache = c),
      error: (e) => (this.erro = e?.error?.mensagem || 'Não foi possível carregar o cache de filiais.')
    });
  }

  invalidarTudo(): void {
    this.executar(this.perfil.invalidarTudo(), 'Cache de filiais invalidado');
  }

  invalidarUsuario(e: EntradaCacheFiliais): void {
    this.executar(this.perfil.invalidarUsuario(e.login), `Cache de ${e.login} invalidado`);
  }

  private executar(acao: ReturnType<PerfilService['invalidarTudo']>, msg: string): void {
    this.invalidando = true;
    this.erro = '';
    this.sucesso = '';
    acao.pipe(finalize(() => (this.invalidando = false))).subscribe({
      next: (r) => {
        this.sucesso = `${msg} (${r.removidas} entrada(s)).`;
        this.carregar();
      },
      error: (e) => (this.erro = e?.error?.mensagem || 'Não foi possível invalidar o cache.')
    });
  }
}
