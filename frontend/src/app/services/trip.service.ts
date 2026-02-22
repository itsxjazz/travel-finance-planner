import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/trips';

  // Dicionário expandido: Mapeia o IATA para o centro da cidade
  private iataCoordinates: { [key: string]: { lat: number, lng: number } } = {
    // Américas
    'GRU': { lat: -23.5505, lng: -46.6333 }, // São Paulo
    'NYC': { lat: 40.7128, lng: -74.0060 },  // Nova York
    'YTO': { lat: 43.6510, lng: -79.3470 },  // Toronto
    'MEX': { lat: 19.4326, lng: -99.1332 },  // Cidade do México
    'EZE': { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
    'SCL': { lat: -33.4489, lng: -70.6693 }, // Santiago
    'BOG': { lat: 4.7110, lng: -74.0721 },  // Bogotá
    'LIM': { lat: -12.0464, lng: -77.0428 }, // Lima
    'MVD': { lat: -34.9011, lng: -56.1645 }, // Montevidéu
    // Europa
    'PAR': { lat: 48.8566, lng: 2.3522 },    // Paris
    'LON': { lat: 51.5074, lng: -0.1278 },   // Londres
    'LIS': { lat: 38.7223, lng: -9.1393 },   // Lisboa
    'MAD': { lat: 40.4168, lng: -3.7038 },   // Madrid
    'ROM': { lat: 41.9028, lng: 12.4964 },   // Roma
    'BER': { lat: 52.5200, lng: 13.4050 },   // Berlim
    'AMS': { lat: 52.3676, lng: 4.9041 },    // Amsterdã
    'ZRH': { lat: 47.3769, lng: 8.5417 },    // Zurique
    'BRU': { lat: 50.8503, lng: 4.3517 },    // Bruxelas
    'VIE': { lat: 48.2082, lng: 16.3738 },   // Viena
    // Ásia e Oceania
    'TYO': { lat: 35.6762, lng: 139.6503 },  // Tóquio
    'SEL': { lat: 37.5665, lng: 126.9780 },  // Seul
    'SIN': { lat: 1.3521, lng: 103.8198 },  // Singapura
    'BKK': { lat: 13.7563, lng: 100.5018 },  // Bangkok
    'DXB': { lat: 25.2048, lng: 55.2708 },   // Dubai
    'SYD': { lat: -33.8688, lng: 151.2093 }, // Sydney
    'AKL': { lat: -36.8485, lng: 174.7633 }, // Auckland
    // África
    'CAI': { lat: 30.0444, lng: 31.2357 }    // Cairo
  };

  saveTripPlan(tripData: any): Observable<any> { return this.http.post(this.apiUrl, tripData); }
  getTrips(): Observable<any[]> { return this.http.get<any[]>(this.apiUrl); }
  updateTrip(id: string, tripData: any): Observable<any> { return this.http.put(`${this.apiUrl}/${id}`, tripData); }
  deleteTrip(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/${id}`); }

  calculateSmartBudget(preferences: any): Observable<any> {
    const cleanBaseUrl = this.apiUrl.replace('/trips', '');
    return this.http.post(`${cleanBaseUrl}/budget/calculate`, preferences);
  }

  // Busca de POIs passando IATA e transformando em Coordenadas
  getPointsOfInterest(iataCode: string): Observable<any> {
    const coords = this.iataCoordinates[iataCode];
    if (!coords) {
      throw new Error('Destino não mapeado para coordenadas.');
    }

    const cleanBaseUrl = this.apiUrl.replace('/trips', '');
    return this.http.get(`${cleanBaseUrl}/locals/pois?lat=${coords.lat}&lng=${coords.lng}`);
  }
}
