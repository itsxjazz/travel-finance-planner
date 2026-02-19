import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; 

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './planner.html',
  styleUrl: './planner.scss' // ou .css
})
export class Planner implements OnInit {
  tripDetails: any = null;

  ngOnInit() {
    // O history.state captura os dados invisíveis enviados pelo Router
    if (history.state && history.state.tripData) {
      this.tripDetails = history.state.tripData;
      console.log('Bagagem recebida com sucesso no Planner:', this.tripDetails);
    }
  }
}