import { Component, Output, EventEmitter, computed, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-savings-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './savings-calculator.html'
})
export class SavingsCalculator {
  readonly Infinity = Infinity;

  // Transforma os Inputs em Signals (Signal Inputs)
  targetAmountBrl = input<number>(0);
  cdiRate = input<number>(0);
  currentSavings = input<number>(0);
  monthlyContribution = input<number>(0);
  indexPercentage = input<number>(100);

  // Eventos para o Maestro
  @Output() savingsChange = new EventEmitter<number>();
  @Output() contributionChange = new EventEmitter<number>();
  @Output() indexChange = new EventEmitter<number>();
  @Output() dateCalculated = new EventEmitter<Date | null>();

  constructor() {
    effect(() => {
       const calculatedDate = this.travelDate();
       this.dateCalculated.emit(calculatedDate);
    });
  }

  // Agora o computed rastreia as mudanças corretamente
  finalAnnualTax = computed(() => (this.cdiRate() * this.indexPercentage()) / 100);

  private getIRRate(months: number): number {
    if (months <= 6) return 0.225;
    if (months <= 12) return 0.20;
    if (months <= 24) return 0.175;
    return 0.15;
  }

  monthsToGoal = computed(() => {
    const target = this.targetAmountBrl();
    const initial = this.currentSavings();
    const monthlyAdd = this.monthlyContribution();

    if (target <= 0 || (monthlyAdd <= 0 && initial < target)) return Infinity;
    if (initial >= target) return 0;

    let months = 0;
    let balanceGross = initial;
    const annualRate = this.finalAnnualTax() / 100;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    while (months < 600) {
      months++;
      balanceGross = (balanceGross * (1 + monthlyRate)) + monthlyAdd;
      const totalInvestedSoFar = initial + (monthlyAdd * months);
      const profit = balanceGross - totalInvestedSoFar;
      const ir = this.getIRRate(months);
      const netBalance = totalInvestedSoFar + (profit * (1 - ir));
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
      totalInvested,
      grossInterest: profit,
      totalIR,
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

  onInput(event: any, type: 'savings' | 'contribution' | 'index') {
    let val = event.target.value;
    if (!val) val = 0;
    const cleanVal = parseFloat(val.toString().replace(/\./g, '').replace(/,/g, '.')) || 0;

    if (type === 'savings') this.savingsChange.emit(cleanVal);
    if (type === 'contribution') this.contributionChange.emit(cleanVal);
    if (type === 'index') this.indexChange.emit(cleanVal);
  }
}
