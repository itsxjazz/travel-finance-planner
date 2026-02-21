import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private http = inject(HttpClient);
  private apiUrl = 'https://ideal-barnacle-694w6v5p76w7h4qwj-5000.app.github.dev/api/trips';

  saveTripPlan(tripData: any): Observable<any> {
    return this.http.post(this.apiUrl, tripData);
  }

  getTrips(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  updateTrip(id: string, tripData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, tripData);
  }

  deleteTrip(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  calculateSmartBudget(preferences: any): Observable<any> {
    
    const cleanBaseUrl = this.apiUrl.replace('/trips', '');
    const endpoint = `${cleanBaseUrl}/budget/calculate`;
    console.log('Testando URL corrigida:', endpoint); 
    
    return this.http.post(endpoint, preferences);
  }
}