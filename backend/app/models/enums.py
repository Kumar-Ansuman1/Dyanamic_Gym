
from enum import Enum


class SubscriptionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CASH = "cash"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    OTHER = "other"


class PaymentStatus(str, Enum):
    RECORDED = "recorded"
    REVERSED = "reversed"
    REFUNDED = "refunded"


class NotificationChannel(str, Enum):
    DASHBOARD = "dashboard"
    EMAIL = "email"
    WHATSAPP = "whatsapp"


class ReminderType(str, Enum):
    SEVEN_DAY = "seven_day"
    THREE_DAY = "three_day"
    EXPIRY_DAY = "expiry_day"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"
