import { Company } from '@/_model/Comapny';
import { CompanysService } from '@/_service/companys.service';
import { AppFloatingConfigurator } from '@/layout/component/app.floatingconfigurator';
import { INPUTS } from '@/modules';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';


@Component({
    selector: 'app-companys',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ...INPUTS
    ],
    templateUrl: 'companys.html',
    styleUrl: 'companys.scss'
})
export class CompanysComponent implements OnInit{

    companys : Array<Company> = []

    cnpjsOptions : Array<{label : string, value:string}> = []

    selectedCnpj: string | null = null;
    nome = '';

    constructor(private service : CompanysService){

    }

    ngOnInit(): void {
        this.loadCnpjsDisponiveis()
        this.loadEmpresas()
        
    }

    salvar(){
        if(this.selectedCnpj)
            this.service.salvar({cnpj : this.selectedCnpj, nome: this.nome}).subscribe(() => {
                this.nome = ''
                this.selectedCnpj = null
                this.ngOnInit()
            })
    }

    onDelete(empresa : Company){
        this.service.delete(empresa.cnpj).subscribe(() => {
            this.ngOnInit()
        })
    }

    loadEmpresas(){
        this.service.get().subscribe(it =>{
            this.companys = it
        })
    }

    loadCnpjsDisponiveis(){
        this.service.getCnpjsDisponiveis().subscribe(it => {
            this.cnpjsOptions = it.map(cnpj => ({ label: cnpj, value: cnpj }));
        });
    }

    

}
