"""
Test script to verify ML service heuristic forecasting
Run: python test_ml_service.py
"""

import requests
import json
from datetime import datetime, timedelta

ML_SERVICE_URL = "http://localhost:8000"

def test_health_check():
    """Test 1: Health check"""
    print("\n📌 Test 1: Health Check")
    try:
        response = requests.get(f"{ML_SERVICE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        assert response.status_code == 200
        assert response.json()['status'] == 'healthy'
        print("✅ PASSED")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False

def test_heuristic_prediction():
    """Test 2: Heuristic prediction"""
    print("\n📌 Test 2: Heuristic Prediction")
    
    # Prepare test data
    today = datetime.now()
    invoice_date = (today - timedelta(days=15)).isoformat()
    
    payload = {
        "tenant_id": "test-tenant-123",
        "invoices": [
            {
                "id": "inv-001",
                "invoice_date": invoice_date,
                "amount": 250000,
                "payment_terms_days": 30,
                "customer_name": "Acme Corp",
                "customer_avg_delay_days": 12
            },
            {
                "id": "inv-002",
                "invoice_date": invoice_date,
                "amount": 150000,
                "payment_terms_days": 45,
                "customer_name": "XYZ Ltd",
                "customer_avg_delay_days": 5
            }
        ],
        "payment_probabilities": {
            "inv-001": 0.72,
            "inv-002": 0.85
        },
        "horizon_days": 30
    }
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/predict",
            json=payload,
            timeout=15
        )
        
        print(f"Status Code: {response.status_code}")
        result = response.json()
        
        print(f"\nModel Version: {result.get('model_version')}")
        print(f"Number of Predictions: {len(result.get('predictions', []))}")
        print(f"Critical Dates: {len(result.get('critical_dates', []))}")
        
        # Validate structure
        assert response.status_code == 200
        assert 'predictions' in result
        assert 'model_version' in result
        assert 'heuristic' in result['model_version']
        
        # Show sample prediction
        if result['predictions']:
            sample = result['predictions'][0]
            print(f"\nSample Prediction:")
            print(f"  Date: {sample['date']}")
            print(f"  Realistic Balance: ₹{sample['scenarios']['realistic']:,.0f}")
            print(f"  Optimistic: ₹{sample['scenarios']['optimistic']:,.0f}")
            print(f"  Pessimistic: ₹{sample['scenarios']['pessimistic']:,.0f}")
            print(f"  Confidence: {sample['confidence']:.2f}")
        
        print("\n✅ PASSED")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False

def test_model_info():
    """Test 3: Model info endpoint"""
    print("\n📌 Test 3: Model Info")
    try:
        response = requests.get(f"{ML_SERVICE_URL}/model/info")
        print(f"Status Code: {response.status_code}")
        info = response.json()
        print(f"Model Type: {info.get('model_type')}")
        print(f"Status: {info.get('status')}")
        print(f"Accuracy MAE: {info.get('accuracy_mae')}")
        
        assert response.status_code == 200
        print("✅ PASSED")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("ML SERVICE VERIFICATION TESTS")
    print("=" * 60)
    
    results = []
    results.append(("Health Check", test_health_check()))
    results.append(("Heuristic Prediction", test_heuristic_prediction()))
    results.append(("Model Info", test_model_info()))
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    total_passed = sum(1 for _, passed in results if passed)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
    
    return total_passed == len(results)

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
