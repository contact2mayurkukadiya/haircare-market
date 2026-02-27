import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, finalize } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private readonly baseUrl = environment.apiUrl;

    // Global loading signal
    public isLoading = signal<boolean>(false);

    constructor(private http: HttpClient) { }

    get<T>(path: string, params: HttpParams = new HttpParams()): Observable<T> {
        this.isLoading.set(true);
        return this.http.get<T>(`${this.baseUrl}${path}`, { params }).pipe(
            finalize(() => this.isLoading.set(false))
        );
    }

    post<T>(path: string, body: any): Observable<T> {
        this.isLoading.set(true);
        return this.http.post<T>(`${this.baseUrl}${path}`, body).pipe(
            finalize(() => this.isLoading.set(false))
        );
    }

    put<T>(path: string, body: any): Observable<T> {
        this.isLoading.set(true);
        return this.http.put<T>(`${this.baseUrl}${path}`, body).pipe(
            finalize(() => this.isLoading.set(false))
        );
    }

    patch<T>(path: string, body: any): Observable<T> {
        this.isLoading.set(true);
        return this.http.patch<T>(`${this.baseUrl}${path}`, body).pipe(
            finalize(() => this.isLoading.set(false))
        );
    }

    delete<T>(path: string): Observable<T> {
        this.isLoading.set(true);
        return this.http.delete<T>(`${this.baseUrl}${path}`).pipe(
            finalize(() => this.isLoading.set(false))
        );
    }
}
