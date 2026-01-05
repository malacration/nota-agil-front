import { JobsService } from '@/_service/jobs.service';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { COMMON, INPUTS } from '@/modules';
import { JobState } from '@/_model/Job';
import { DatePickerModule } from 'primeng/datepicker';
import { PrimeNG } from 'primeng/config';




@Component({
    selector: 'app-job-state',
    standalone: true,
    imports: [
        ...COMMON,
        ...INPUTS,
        DatePickerModule,
    ],
    templateUrl: 'state.component.html',
    styleUrl: 'state.component.scss'
})
export class StateComponent implements OnInit, OnChanges {
    
    @Input()
    model: JobState = {
        id: '',
        cursor: 0,
        lastFrom: 0, // segundos
    };

    lastFromDate: Date | null = null;

    constructor(private config: PrimeNG) {}



    ngOnInit() {
        this.pullFromModel();
    }

    ngOnChanges() {
        this.pullFromModel();
    }

    private pullFromModel(): void {
        if (this.model?.lastFrom) {
            this.lastFromDate = this.fromEpochSecondsToDate(this.model?.lastFrom);
        }
    }

    private fromEpochSecondsToDate(v: any): Date {
        const val = typeof v == 'string' ? v : v * 1000;
        const date = new Date(val);
        
        return isNaN(date.getTime()) ? new Date() : date;
    }

    /** Handler para mudanças no datepicker */
    onDateChange(d: Date): void {
        if(d){
            this.lastFromDate = d;
            this.model.lastFrom = Math.floor(d.getTime() / 1000);
        }
    }

    /** Converte Date -> epoch em segundos (UTC) */
    private toEpochSeconds(d: Date): number {
        return Math.floor((d.getTime()-this.getTimeZoneInMs()) / 1000);
    }

    getTimeZoneInMs() : number{
        return new Date().getTimezoneOffset() * 60 * 1000
    }
}
