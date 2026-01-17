"""
LSTM Model for Cash Flow Forecasting
PyTorch implementation of time-series prediction model
"""

import torch
import torch.nn as nn
from typing import Tuple

class CashFlowLSTM(nn.Module):
    """
    LSTM neural network for cash flow forecasting
    
    Architecture:
    - Input: Sequence of invoice/payment features
    - LSTM layers: 2 layers with hidden size 128
    - Output: Predicted cash balance
    """
    
    def __init__(
        self,
        input_size: int = 10,  # Number of features per timestep
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        output_size: int = 1  # Predict single value (cash balance)
    ):
        super(CashFlowLSTM, self).__init__()
        
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Fully connected layers
        self.fc1 = nn.Linear(hidden_size, 64)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(64, output_size)
        
    def forward(
        self,
        x: torch.Tensor,
        hidden: Tuple[torch.Tensor, torch.Tensor] = None
    ) -> Tuple[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """
        Forward pass
        
        Args:
            x: Input tensor of shape (batch_size, sequence_length, input_size)
            hidden: Optional hidden state tuple (h_0, c_0)
        
        Returns:
            output: Predictions of shape (batch_size, output_size)
            hidden: Hidden state tuple for next iteration
        """
        # LSTM forward pass
        lstm_out, hidden = self.lstm(x, hidden)
        
        # Take output from last timestep
        last_output = lstm_out[:, -1, :]
        
        # Fully connected layers
        out = self.fc1(last_output)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc2(out)
        
        return out, hidden
    
    def predict_sequence(
        self,
        initial_input: torch.Tensor,
        steps: int
    ) -> torch.Tensor:
        """
        Predict multiple future steps (for 7/30/90 day forecasts)
        
        Args:
            initial_input: Initial sequence (batch_size, seq_len, input_size)
            steps: Number of future steps to predict
        
        Returns:
            predictions: Tensor of shape (batch_size, steps)
        """
        self.eval()
        predictions = []
        hidden = None
        current_input = initial_input
        
        with torch.no_grad():
            for _ in range(steps):
                # Predict next step
                pred, hidden = self.forward(current_input, hidden)
                predictions.append(pred)
                
                # Update input for next step
                # (In practice, you'd append pred to current_input and shift)
                # Simplified here for skeleton
                
        return torch.cat(predictions, dim=1)


class MultiHorizonLSTM(nn.Module):
    """
    LSTM model that predicts multiple horizons (7, 30, 90 days) with confidence scores
    """
    
    def __init__(
        self,
        input_size: int = 10,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2
    ):
        super(MultiHorizonLSTM, self).__init__()
        
        # Shared LSTM encoder
        self.encoder = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Separate heads for each horizon
        self.head_7day = nn.Linear(hidden_size, 7)   # 7-day predictions
        self.head_30day = nn.Linear(hidden_size, 30) # 30-day predictions
        self.head_90day = nn.Linear(hidden_size, 90) # 90-day predictions
        
        # Confidence estimation heads (output probability distribution)
        self.confidence_7day = nn.Linear(hidden_size, 7)
        self.confidence_30day = nn.Linear(hidden_size, 30)
        self.confidence_90day = nn.Linear(hidden_size, 90)
        
    def forward(self, x: torch.Tensor, horizon: str = "30"):
        """
        Forward pass with horizon selection
        
        Args:
            x: Input (batch_size, sequence_length, input_size)
            horizon: "7", "30", or "90"
        
        Returns:
            predictions: Predicted cash balances
            confidence: Confidence scores (0-1)
        """
        # Encode sequence
        lstm_out, _ = self.encoder(x)
        encoded = lstm_out[:, -1, :]  # Last timestep
        
        # Select appropriate head
        if horizon == "7":
            predictions = self.head_7day(encoded)
            confidence_logits = self.confidence_7day(encoded)
        elif horizon == "30":
            predictions = self.head_30day(encoded)
            confidence_logits = self.confidence_30day(encoded)
        elif horizon == "90":
            predictions = self.head_90day(encoded)
            confidence_logits = self.confidence_90day(encoded)
        else:
            raise ValueError(f"Invalid horizon: {horizon}")
        
        # Convert confidence logits to probabilities
        confidence = torch.sigmoid(confidence_logits)
        
        return predictions, confidence


def create_model(model_config: dict) -> nn.Module:
    """
    Factory function to create model based on config
    
    Args:
        model_config: Configuration dictionary
    
    Returns:
        Initialized model
    """
    model_type = model_config.get("type", "multi_horizon")
    
    if model_type == "multi_horizon":
        model = MultiHorizonLSTM(
            input_size=model_config.get("input_size", 10),
            hidden_size=model_config.get("hidden_size", 128),
            num_layers=model_config.get("num_layers", 2),
            dropout=model_config.get("dropout", 0.2)
        )
    elif model_type == "single":
        model = CashFlowLSTM(
            input_size=model_config.get("input_size", 10),
            hidden_size=model_config.get("hidden_size", 128),
            num_layers=model_config.get("num_layers", 2),
            dropout=model_config.get("dropout", 0.2)
        )
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    return model


if __name__ == "__main__":
    # Test model creation
    model = create_model({"type": "multi_horizon"})
    print(f"Model created: {model}")
    print(f"Total parameters: {sum(p.numel() for p in model.parameters())}")
    
    # Test forward pass
    batch_size = 4
    sequence_length = 60  # 60 days of history
    input_size = 10
    
    test_input = torch.randn(batch_size, sequence_length, input_size)
    predictions, confidence = model(test_input, horizon="30")
    
    print(f"Input shape: {test_input.shape}")
    print(f"Predictions shape: {predictions.shape}")
    print(f"Confidence shape: {confidence.shape}")
