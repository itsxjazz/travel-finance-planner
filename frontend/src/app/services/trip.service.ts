import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private http = inject(HttpClient);
  // URL base do servidor Node.js (ajuste a porta se o seu backend estiver rodando em uma diferente)
    private apiUrl = 'https://ideal-barnacle-694w6v5p76w7h4qwj-5000.app.github.dev/api/trips';

  saveTripPlan(tripData: any): Observable<any> {
    return this.http.post(this.apiUrl, tripData);
  }

    getTrips(): Observable<any[]> {
     return this.http.get<any[]>(this.apiUrl);
    }
}