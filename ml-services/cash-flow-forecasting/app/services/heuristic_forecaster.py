"""
Heuristic Cash Flow Forecasting
Simple rule-based forecasting for initial model training and fallback
"""

# import torch
# import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class HeuristicForecaster:
    """
    Rule-based cash flow forecasting
    Used when:
    1. ML model not yet trained
    2. Insufficient historical data
    3. ML service failure (fallback)
    """
    
    def __init__(self):
        self.confidence_base = 0.7  # Base confidence for heuristic
    
    def predict(
        self,
        invoices: List[Dict[str, Any]],
        payment_probabilities: Dict[str, float],
        horizon_days: int
    ) -> Dict[str, Any]:
        """
        Generate heuristic forecast
        
        Formula:
        Expected Payment Date = Invoice Date + Payment Terms + Customer Average Delay
        Expected Amount = Invoice Amount * Payment Probability
        """
        logger.info(f"Generating heuristic forecast for {len(invoices)} invoices, {horizon_days} days")
        
        # Group invoices by expected payment date
        daily_inflows = {}
        today = datetime.now().date()
        
        for invoice in invoices:
            expected_date = self._calculate_expected_payment_date(invoice)
            days_from_now = (expected_date - today).days
            
            # Only include if within horizon
            if 0 <= days_from_now <= horizon_days:
                date_str = expected_date.isoformat()
                invoice_id = invoice.get('id', '')
                payment_prob = payment_probabilities.get(invoice_id, 0.5)
                
                expected_amount = invoice['amount'] * payment_prob
                
                if date_str not in daily_inflows:
                    daily_inflows[date_str] = {
                        'date': date_str,
                        'invoices': [],
                        'total_expected': 0,
                        'total_optimistic': 0,
                        'total_pessimistic': 0
                    }
                
                daily_inflows[date_str]['invoices'].append({
                    'invoice_id': invoice_id,
                    'customer_name': invoice.get('customer_name', 'Unknown'),
                    'amount': invoice['amount'],
                    'payment_probability': payment_prob,
                    'expected_amount': expected_amount
                })
                
                # Scenarios
                daily_inflows[date_str]['total_expected'] += expected_amount
                daily_inflows[date_str]['total_optimistic'] += invoice['amount']  # 100% collection
                daily_inflows[date_str]['total_pessimistic'] += expected_amount * 0.7  # 70% of expected
        
        # Generate cumulative cash flow timeline
        timeline = self._generate_timeline(daily_inflows, horizon_days)
        
        # Identify critical dates
        critical_dates = self._identify_critical_dates(timeline)
        
        return {
            'predictions': timeline,
            'critical_dates': critical_dates,
            'model_version': 'heuristic-v1.0',
            'confidence': self.confidence_base,
            'method': 'rule_based'
        }
    
    def _calculate_expected_payment_date(self, invoice: Dict[str, Any]) -> datetime.date:
        """Calculate expected payment date based on terms and historical delay"""
        invoice_date = datetime.fromisoformat(invoice['invoice_date']).date()
        payment_terms = invoice.get('payment_terms_days', 30)
        
        # Customer average delay (from historical data or default)
        avg_delay = invoice.get('customer_avg_delay_days', 0)
        
        expected_date = invoice_date + timedelta(days=payment_terms + avg_delay)
        return expected_date
    
    def _generate_timeline(
        self,
        daily_inflows: Dict[str, Dict],
        horizon_days: int
    ) -> List[Dict[str, Any]]:
        """Generate daily cash flow timeline with cumulative balance"""
        timeline = []
        current_balance = 0  # TODO: Get actual current cash balance
        
        today = datetime.now().date()
        
        for day_offset in range(horizon_days + 1):
            forecast_date = today + timedelta(days=day_offset)
            date_str = forecast_date.isoformat()
            
            # Get inflows for this date
            day_data = daily_inflows.get(date_str, {
                'total_expected': 0,
                'total_optimistic': 0,
                'total_pessimistic': 0,
                'invoices': []
            })
            
            # Calculate cumulative balance (simplified - just inflows for now)
            current_balance += day_data['total_expected']
            
            timeline.append({
                'date': date_str,
                'scenarios': {
                    'realistic': current_balance,
                    'optimistic': current_balance + (day_data['total_optimistic'] - day_data['total_expected']),
                    'pessimistic': current_balance - (day_data['total_expected'] - day_data['total_pessimistic'])
                },
                'confidence': self.confidence_base,
                'contributing_invoices': day_data['invoices'][:5]  # Top 5 invoices
            })
        
        return timeline
    
    def _identify_critical_dates(self, timeline: List[Dict]) -> List[Dict]:
        """Identify dates requiring attention"""
        critical = []
        
        for entry in timeline:
            realistic_balance = entry['scenarios']['realistic']
            
            # Cash gap detection
            if realistic_balance < 50000:  # Threshold
                critical.append({
                    'date': entry['date'],
                    'type': 'cash_gap',
                    'severity': 'high' if realistic_balance < 0 else 'medium',
                    'predicted_balance': realistic_balance,
                    'recommendations': [
                        'Factor high-value invoices',
                        'Accelerate collections on overdue invoices'
                    ]
                })
            
            # Large inflow detection
            invoices = entry.get('contributing_invoices', [])
            for inv in invoices:
                if inv.get('amount', 0) > 100000:  # ₹1L threshold
                    critical.append({
                        'date': entry['date'],
                        'type': 'large_inflow',
                        'severity': 'info',
                        'amount': inv['amount'],
                        'customer': inv.get('customer_name')
                    })
                    break  # One per day
        
        return critical


# Initialize global heuristic forecaster
heuristic_forecaster = HeuristicForecaster()


def get_heuristic_forecast(
    invoices: List[Dict[str, Any]],
    payment_probabilities: Dict[str, float],
    horizon_days: int
) -> Dict[str, Any]:
    """
    Convenience function to get heuristic forecast
    """
    return heuristic_forecaster.predict(invoices, payment_probabilities, horizon_days)
