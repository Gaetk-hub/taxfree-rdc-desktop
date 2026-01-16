"""
Payment providers (mock implementations).
"""
import uuid
import random
from abc import ABC, abstractmethod
from decimal import Decimal

from apps.refunds.models import RefundMethod


class BasePaymentProvider(ABC):
    """Base class for payment providers."""
    
    name = "base"
    
    @abstractmethod
    def process_payment(self, amount, currency, payment_details, reference):
        """
        Process a payment.
        
        Args:
            amount: Decimal amount to pay
            currency: Currency code
            payment_details: dict with payment info
            reference: Reference string
            
        Returns:
            dict with:
                - success: bool
                - request_id: str
                - response_id: str
                - request: dict (sanitized)
                - response: dict
                - error_code: str (if failed)
                - error_message: str (if failed)
        """
        pass


class MockCardProvider(BasePaymentProvider):
    """Mock card payment provider."""
    
    name = "mock_card"
    
    def process_payment(self, amount, currency, payment_details, reference):
        request_id = str(uuid.uuid4())
        response_id = str(uuid.uuid4())
        
        # Simulate 90% success rate
        success = random.random() < 0.9
        
        result = {
            'success': success,
            'request_id': request_id,
            'response_id': response_id,
            'request': {
                'amount': str(amount),
                'currency': currency,
                'card_token': payment_details.get('card_token', '')[:8] + '****',
                'reference': reference
            },
            'response': {
                'status': 'APPROVED' if success else 'DECLINED',
                'transaction_id': response_id if success else None
            }
        }
        
        if not success:
            result['error_code'] = 'CARD_DECLINED'
            result['error_message'] = 'Card was declined by issuer'
        
        return result


class MockBankTransferProvider(BasePaymentProvider):
    """Mock bank transfer provider."""
    
    name = "mock_bank"
    
    def process_payment(self, amount, currency, payment_details, reference):
        request_id = str(uuid.uuid4())
        response_id = str(uuid.uuid4())
        
        # Simulate 95% success rate
        success = random.random() < 0.95
        
        result = {
            'success': success,
            'request_id': request_id,
            'response_id': response_id,
            'request': {
                'amount': str(amount),
                'currency': currency,
                'account': '****' + payment_details.get('account_number', '')[-4:],
                'bank_code': payment_details.get('bank_code', ''),
                'reference': reference
            },
            'response': {
                'status': 'INITIATED' if success else 'FAILED',
                'transfer_id': response_id if success else None
            }
        }
        
        if not success:
            result['error_code'] = 'TRANSFER_FAILED'
            result['error_message'] = 'Bank transfer could not be initiated'
        
        return result


class MockMobileMoneyProvider(BasePaymentProvider):
    """Mock mobile money provider."""
    
    name = "mock_momo"
    
    def process_payment(self, amount, currency, payment_details, reference):
        request_id = str(uuid.uuid4())
        response_id = str(uuid.uuid4())
        
        # Simulate 85% success rate
        success = random.random() < 0.85
        
        result = {
            'success': success,
            'request_id': request_id,
            'response_id': response_id,
            'request': {
                'amount': str(amount),
                'currency': currency,
                'phone': '****' + payment_details.get('phone_number', '')[-4:],
                'provider': payment_details.get('provider', ''),
                'reference': reference
            },
            'response': {
                'status': 'SUCCESS' if success else 'FAILED',
                'transaction_id': response_id if success else None
            }
        }
        
        if not success:
            error_codes = ['INSUFFICIENT_BALANCE', 'INVALID_NUMBER', 'SERVICE_UNAVAILABLE']
            result['error_code'] = random.choice(error_codes)
            result['error_message'] = f'Mobile money error: {result["error_code"]}'
        
        return result


class MockCashProvider(BasePaymentProvider):
    """Mock cash provider (always succeeds as it's manual)."""
    
    name = "mock_cash"
    
    def process_payment(self, amount, currency, payment_details, reference):
        request_id = str(uuid.uuid4())
        
        # Cash is always "initiated" - actual collection is manual
        return {
            'success': True,
            'request_id': request_id,
            'response_id': request_id,
            'request': {
                'amount': str(amount),
                'currency': currency,
                'reference': reference
            },
            'response': {
                'status': 'READY_FOR_COLLECTION',
                'collection_code': request_id[:8].upper()
            }
        }


def get_payment_provider(method):
    """Get payment provider for a refund method."""
    providers = {
        RefundMethod.CARD: MockCardProvider(),
        RefundMethod.BANK_TRANSFER: MockBankTransferProvider(),
        RefundMethod.MOBILE_MONEY: MockMobileMoneyProvider(),
        RefundMethod.CASH: MockCashProvider(),
    }
    return providers.get(method, MockCardProvider())
