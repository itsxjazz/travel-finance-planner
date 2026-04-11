import { Component, input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trip-itinerary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trip-itinerary.html',
  styleUrls: ['./trip-itinerary.scss']
})
export class TripItinerary {
  items = input<any[]>([]);
  @Output() removeRequested = new EventEmitter<string>();

  isExpanded = signal(false);

  toggleAccordion() {
    this.isExpanded.update(v => !v);
  }

  // Lógica de tradução isolada
  translateCategory(category: string): string {
    const categories: { [key: string]: string } = {
      'CULTURA': 'Cultura',
      'RESTAURANT': 'Gastronomia',
      'SHOPPING': 'Compras'
    };
    return categories[category] || category;
  }

  removeItem(id: string) {
    this.removeRequested.emit(id);
  }
}
