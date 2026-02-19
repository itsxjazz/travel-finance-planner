import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private http = inject(HttpClient); 
  private baseUrl = 'https://restcountries.com/v3.1';

  getCountry(name: string): Observable<any> {
  const encodedName = encodeURIComponent(name.trim());

  return this.http.get(
    `${this.baseUrl}/name/${encodedName}?fullText=false`
  ).pipe(
    catchError(() => {
      return this.http.get(
        `${this.baseUrl}/translation/${encodedName}`
      );
    })
  );
}
}
