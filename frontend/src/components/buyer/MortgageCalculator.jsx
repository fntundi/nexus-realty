import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, DollarSign, Percent, Calendar } from 'lucide-react';

export default function MortgageCalculator({ defaultPrice = 300000 }) {
  const [price, setPrice] = useState(defaultPrice);
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);

  const loanAmount = price - (price * downPayment / 100);
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;
  
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  const totalPayment = monthlyPayment * numberOfPayments;
  const totalInterest = totalPayment - loanAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Mortgage Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Home Price */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Home Price
          </Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="text-lg font-semibold"
          />
        </div>

        {/* Down Payment */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Down Payment</Label>
            <span className="text-sm font-semibold">
              {downPayment}% (${((price * downPayment) / 100).toLocaleString()})
            </span>
          </div>
          <Slider
            value={[downPayment]}
            onValueChange={(val) => setDownPayment(val[0])}
            min={0}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Interest Rate
            </Label>
            <span className="text-sm font-semibold">{interestRate}%</span>
          </div>
          <Slider
            value={[interestRate]}
            onValueChange={(val) => setInterestRate(val[0])}
            min={3}
            max={10}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Loan Term */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Loan Term
            </Label>
            <span className="text-sm font-semibold">{loanTerm} years</span>
          </div>
          <Slider
            value={[loanTerm]}
            onValueChange={(val) => setLoanTerm(val[0])}
            min={10}
            max={30}
            step={5}
            className="w-full"
          />
        </div>

        {/* Results */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="text-slate-600">Monthly Payment</span>
            <span className="text-2xl font-bold text-blue-600">
              ${monthlyPayment.toFixed(0).toLocaleString()}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-slate-50 rounded">
              <div className="text-slate-600">Loan Amount</div>
              <div className="font-semibold">${loanAmount.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-slate-50 rounded">
              <div className="text-slate-600">Total Interest</div>
              <div className="font-semibold">${totalInterest.toFixed(0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}