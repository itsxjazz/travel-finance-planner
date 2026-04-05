import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private http = inject(HttpClient);

  private baseApiUrl = environment.apiUrl;
  private apiUrl = `${environment.apiUrl}/trips`;

  // Dicionário: Mapeia o IATA para o centro da cidade
  private iataCoordinates: { [key: string]: { lat: number, lng: number } } = {
    'GRU': { lat: -23.5505, lng: -46.6333 }, 'NYC': { lat: 40.7128, lng: -74.0060 },
    'YTO': { lat: 43.6510, lng: -79.3470 }, 'MEX': { lat: 19.4326, lng: -99.1332 },
    'EZE': { lat: -34.6037, lng: -58.3816 }, 'SCL': { lat: -33.4489, lng: -70.6693 },
    'BOG': { lat: 4.7110, lng: -74.0721 }, 'LIM': { lat: -12.0464, lng: -77.0428 },
    'MVD': { lat: -34.9011, lng: -56.1645 }, 'PAR': { lat: 48.8566, lng: 2.3522 },
    'LON': { lat: 51.5074, lng: -0.1278 }, 'LIS': { lat: 38.7223, lng: -9.1393 },
    'MAD': { lat: 40.4168, lng: -3.7038 }, 'ROM': { lat: 41.9028, lng: 12.4964 },
    'BER': { lat: 52.5200, lng: 13.4050 }, 'AMS': { lat: 52.3676, lng: 4.9041 },
    'ZRH': { lat: 47.3769, lng: 8.5417 }, 'BRU': { lat: 50.8503, lng: 4.3517 },
    'VIE': { lat: 48.2082, lng: 16.3738 }, 'TYO': { lat: 35.6762, lng: 139.6503 },
    'SEL': { lat: 37.5665, lng: 126.9780 }, 'SIN': { lat: 1.3521, lng: 103.8198 },
    'BKK': { lat: 13.7563, lng: 100.5018 }, 'DXB': { lat: 25.2048, lng: 55.2708 },
    'SYD': { lat: -33.8688, lng: 151.2093 }, 'AKL': { lat: -36.8485, lng: 174.7633 },
    'CAI': { lat: 30.0444, lng: 31.2357 }
  };

  // --- MÉTODOS DE VIAGEM (CRUD) ---
  saveTripPlan(tripData: any): Observable<any> { return this.http.post(this.apiUrl, tripData); }
  getTrips(): Observable<any[]> { return this.http.get<any[]>(this.apiUrl); }
  updateTrip(id: string, tripData: any): Observable<any> { return this.http.put(`${this.apiUrl}/${id}`, tripData); }
  deleteTrip(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/${id}`); }

  calculateSmartBudget(preferences: any): Observable<any> {
    return this.http.post(`${this.baseApiUrl}/budget/calculate`, preferences);
  }

  getPointsOfInterest(iataCode: string): Observable<any> {
    const coords = this.iataCoordinates[iataCode];
    if (!coords) throw new Error('Destino não mapeado para coordenadas.');
    return this.http.get(`${this.baseApiUrl}/locals/pois?lat=${coords.lat}&lng=${coords.lng}`);
  }

  // --- MÉTODOS AMADEUS (HOTÉIS E VOOS) ---
  getHotels(cityCode: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseApiUrl}/hotels/${cityCode}`);
  }

  getFlights(origin: string, destination: string, date: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseApiUrl}/flights/search`, {
      params: { origin, destination, date }
    });
  }
}