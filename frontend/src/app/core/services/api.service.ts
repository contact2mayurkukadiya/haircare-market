import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE_URL = 'http://localhost:3000/api/v1';

export interface ApiRequestOptions {
    params?: HttpParams;
    headers?: HttpHeaders;
}



@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token');
        return token
            ? new HttpHeaders({ Authorization: `Bearer ${token}` })
            : new HttpHeaders();
    }


    get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
        const headers = options.headers
            ? options.headers
            : this.getHeaders();

        return this.http.get<T>(`${BASE_URL}${path}`, {
            headers,
            params: options.params,
        });
    }

    post<T>(path: string, body: any): Observable<T> {
        return this.http.post<T>(`${BASE_URL}${path}`, body, { headers: this.getHeaders() });
    }

    put<T>(path: string, body: any): Observable<T> {
        return this.http.put<T>(`${BASE_URL}${path}`, body, { headers: this.getHeaders() });
    }

    delete<T>(path: string): Observable<T> {
        return this.http.delete<T>(`${BASE_URL}${path}`, { headers: this.getHeaders() });
    }
}
