import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '../../services/currency.service';
import { TaxService } from '../../services/tax.service';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planner.html',
  styleUrl: './planner.scss'
})
export class Planner implements OnInit {
  private currencyService = inject(CurrencyService);
  private taxService = inject(TaxService);
  readonly Infinity = Infinity;
  tripDetails: any = null;
  
  // Inputs Financeiros
  localGoal = signal<number>(0); 
  exchangeRate = signal<number>(0); 
  currentSavings = signal<number>(0);
  monthlyContribution = signal<number>(0);

  // Configuração da Caixinha
  cdiRate = signal<number>(0);
  indexPercentage = signal<number>(100); // O usuário define (ex: 100%, 110%)

  brlGoal = computed(() => this.localGoal() * this.exchangeRate());

  // Taxa Anual Final (CDI * %)
  finalAnnualTax = computed(() => (this.cdiRate() * this.indexPercentage()) / 100);

  private getIRRate(months: number): number {
    if (months <= 6) return 0.225;
    if (months <= 12) return 0.20;
    if (months <= 24) return 0.175;
    return 0.15; // Tabela Regressiva
  }

  monthsToGoal = computed(() => {
    const target = this.brlGoal();
    const initial = this.currentSavings();
    const monthlyAdd = this.monthlyContribution();
    
    if (target <= 0 || (monthlyAdd <= 0 && initial < target)) return Infinity;
    if (initial >= target) return 0;

    let months = 0;
    let balanceGross = initial;
    const annualRate = this.finalAnnualTax() / 100;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1; // Taxa Geométrica

    while (months < 600) {
      months++;
      // Saldo rende -> Depois entra o aporte
      balanceGross = (balanceGross * (1 + monthlyRate)) + monthlyAdd;

      const totalInvested = initial + (monthlyAdd * months);
      const profit = balanceGross - totalInvested;
      const ir = this.getIRRate(months);
      const netBalance = totalInvested + (profit * (1 - ir));

      if (netBalance >= target) return months;
    }
    return Infinity;
  });

  redemptionDetails = computed(() => {
    const months = this.monthsToGoal();
    if (months === Infinity || months === 0) return null;

    const initial = this.currentSavings();
    const monthlyAdd = this.monthlyContribution();
    const annualRate = this.finalAnnualTax() / 100;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    let balanceGross = initial;
    let totalInvested = initial;

    for (let i = 1; i <= months; i++) {
      balanceGross = (balanceGross * (1 + monthlyRate)) + monthlyAdd;
      totalInvested += monthlyAdd;
    }

    const profit = balanceGross - totalInvested;
    const irRate = this.getIRRate(months);
    const totalIR = profit * irRate;

    return {
      totalInvested: totalInvested,
      grossInterest: profit,
      totalIR: totalIR,
      netRedemption: totalInvested + (profit - totalIR),
      irRatePercentage: irRate * 100
    };
  });

  travelDate = computed(() => {
    const months = this.monthsToGoal();
    if (months === Infinity || months === 0) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  });

  ngOnInit() {
    if (history.state && history.state.tripData) {
      this.tripDetails = history.state.tripData;
      this.fetchRate();    
      this.fetchCDI(); 
    }
  }

  fetchRate() {
    this.currencyService.getExchangeRate(this.tripDetails.countryCode).subscribe(rate => {
      this.exchangeRate.set(Math.round(rate * 100) / 100);
    });
  }

  fetchCDI() {
    this.taxService.getRate('CDI').subscribe(rate => this.cdiRate.set(rate));
  }

  handleInput(event: any, signalRef: any) {
    let value = event.target.value;
    if (!value) { signalRef.set(0); return; }
    let cleanValue = value.replace(/\./g, '').replace(/,/g, '.');
    signalRef.set(parseFloat(cleanValue) || 0);
  }
}