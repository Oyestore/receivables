"""Training package initialization"""

from .synthetic_data import SyntheticDataGenerator, generate_train_test_split
from .trainer import train_and_evaluate

__all__ = [
    'SyntheticDataGenerator',
    'generate_train_test_split',
    'train_and_evaluate'
]
