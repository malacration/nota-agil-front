import { JobsService } from '@/_service/jobs.service';
import { AppFloatingConfigurator } from '@/layout/component/app.floatingconfigurator';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { FooterWidget } from '../landing/components/footerwidget';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TreeSelectModule } from 'primeng/treeselect';
import { FormsModule } from '@angular/forms';
import { Company } from '@/_model/Comapny';
import { StateComponent } from './state/state.component';
import { COMMON, INPUTS, TABLE, UIKIT } from '@/modules';
import { JobState, JobStatus } from '@/_model/Job';
import { JobStateService } from '@/_service/jobState.service';


@Component({
    selector: 'app-jobs',
    standalone: true,
    imports: [
        ...COMMON,
        ...TABLE,
        ...INPUTS,
        ...UIKIT,
        StateComponent

        // CommonModule,
        // TableModule,
        // ToolbarModule,
        // DialogModule,
        // BadgeModule,
        // TagModule,
        // ToastModule,
        // ConfirmDialogModule,
        // InputIconModule,
        // ButtonModule,
        // TooltipModule,
        // SelectModule,
        // InputGroupModule,
        // InputNumberModule,
        // InputTextModule,
        // FloatLabelModule,
        // TreeSelectModule,
        // FormsModule,
        // StateComponent
    ],
    
    
    templateUrl: 'jobs.component.html',
})
export class Jobs {
    jobs : Array<JobStatus>= []
    jobDialogVisible = false
    jobStateDialogVisible = false
    
    selected : JobStatus = {
        id: 'none',
        running: true,
        period: 1,
        mode: "FIXED_RATE",
        jobState : {
            id: "",
            cursor: 0,
            lastFrom: 0
        },
        company : new Company()
    }
    
    constructor(private service : JobsService, private serviceJobState : JobStateService){

    }

    ngOnInit(): void {
        this.atualizar()
    }

    changePeriodoModo(job : JobStatus){
        this.selected = job
        this.jobDialogVisible = true
    }

    showJobState(job : JobStatus){
        this.selected = job
        this.jobStateDialogVisible = true
        this.editingState = false;
    }

    atualizar() {
        this.service.list().subscribe(it =>{
            this.jobs = it
        })
    }

    stopAll(){
        this.service.stopAll().subscribe(it =>{
            this.jobs = it
        })
    }

    startAll(){
        this.service.startAll().subscribe(it =>{
            this.jobs = it
        })
    }

    runOnce(id : string){
        this.service.runOnce(id).subscribe(it =>{
            this.atualizar()

        })
    }

    start(id : string){
        this.service.start(id).subscribe(it =>{
            this.atualizar()
        })
    }

    stop(id : string){
        this.service.stop(id).subscribe(it =>{
            this.atualizar()
        })
    }

    closeModal(){
        this.jobDialogVisible = false
    }

    changePeriod(){
        this.service.setPeriod(this.selected.id,this.selected.period).subscribe(it => {
            this.atualizar()
            this.closeModal()
        })   
    }


    editingState = false;

    openJobState(row: any) {
        this.selected = row;
        this.editingState = false;
        this.jobStateDialogVisible = true;
    }

    onEditClick() {
        this.editingState = true;
    }

    cancelEdit() {
        this.editingState = false;
    }

    saveEdit(updated: any) {
        // atualize o estado selecionado com o retorno do <app-state>
        this.selected.jobState = updated;
        this.editingState = false;
    }

    salvarState(state : JobState){
        this.serviceJobState.update(
            state.id,
            state.cursor,
            state.lastFrom)
        .subscribe(it =>{
            this.editingState = false
            this.ngOnInit()
        })
            
    }
}
