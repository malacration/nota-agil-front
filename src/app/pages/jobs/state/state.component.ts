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
        this.lastFromDate = this.fromEpochSecondsToDate(this.model?.lastFrom);
    }

    private fromEpochSecondsToDate(v: number): Date {
        console.log(new Date().getTimezoneOffset(),"timezone")
        return new Date((v * 1000)+this.getTimeZoneInMs());
    }

    /** Handler para mudanças no datepicker */
    onDateChange(d: Date): void {
        this.lastFromDate = d;
        this.model.lastFrom = this.toEpochSeconds(d);
    }

    /** Converte Date -> epoch em segundos (UTC) */
    private toEpochSeconds(d: Date): number {
        return Math.floor((d.getTime()-this.getTimeZoneInMs()) / 1000);
    }

    getTimeZoneInMs() : number{
        return new Date().getTimezoneOffset() * 60 * 1000
    }
}
