import { Company } from "./Comapny";


export type JobMode = 'FIXED_RATE' | 'FIXED_DELAY';

export interface JobStatus {
    id: string;
    running: boolean;
    period: number;
    mode: JobMode;
    jobState: JobState;
    company : Company
}


export interface JobState {
    id : string
    cursor : number
    lastFrom : number
    empresa? : string
    tipo? : string

}