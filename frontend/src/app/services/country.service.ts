import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private http = inject(HttpClient); 
  private baseUrl = 'https://api.restcountries.com/countries/v5';
  private apiKey = 'rc_live_b2b50d357f6e4c0b87adfc247f66ddf9';

  getCountry(name: string): Observable<any> {
    const encodedName = encodeURIComponent(name.trim());
    const headers = { 'Authorization': `Bearer ${this.apiKey}` };

    return this.http.get<any>(
      `${this.baseUrl}?q=${encodedName}`, { headers }
    );
  }
}
