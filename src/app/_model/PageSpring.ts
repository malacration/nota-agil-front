export interface PageSpring<T>{
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;       // página atual (0-based)
    size: number;
}