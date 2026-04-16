import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hotel-details.html',
  styleUrl: './hotel-details.scss'
})
export class HotelDetails {
  @Input({ required: true }) hotel: any;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}