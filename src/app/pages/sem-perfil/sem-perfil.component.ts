import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

/**
 * Sem perfil no Nota Agil (403 no /me) ou perfil nao verificado por falha transitoria
 * (?indisponivel=1&voltar=<rota>): nesse caso oferece tentar de novo a rota pedida.
 */
@Component({
  selector: 'app-sem-perfil',
  standalone: true,
  imports: [ButtonModule],
  template: `<div class="card">
    @if (indisponivel) {
      <div class="font-semibold text-xl mb-2">Não foi possível verificar seu acesso</div>
      <p>O servidor do Nota Ágil não respondeu ao consultar seu perfil. Tente novamente em instantes.</p>
      <p-button label="Tentar novamente" icon="pi pi-refresh" (onClick)="tentarNovamente()" />
    } @else {
      <div class="font-semibold text-xl mb-2">Sem acesso ao Nota Ágil</div>
      <p>Seu usuário não tem perfil no Nota Ágil. Peça ao administrador a role <b>operador</b> (tela Notas ERP)
        ou <b>admin</b> no SSO e entre novamente.</p>
    }
  </div>`
})
export class SemPerfilComponent {
  readonly indisponivel: boolean;
  private readonly voltar: string;

  constructor(route: ActivatedRoute, private router: Router) {
    const params = route.snapshot.queryParamMap;
    this.indisponivel = !!params.get('indisponivel');
    const voltar = params.get('voltar') || '/';
    // So rotas internas do app (evita //host e esquemas).
    this.voltar = voltar.startsWith('/') && !voltar.startsWith('//') && !voltar.startsWith('/sem-perfil') ? voltar : '/';
  }

  tentarNovamente(): void {
    void this.router.navigateByUrl(this.voltar);
  }
}
