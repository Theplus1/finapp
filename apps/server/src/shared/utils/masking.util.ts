export class MaskingUtil {
  static maskCardNumber(cardNumber: string): string {
    // Mask all but last 4 digits
    // 1234567890123456 -> ************3456
    if (cardNumber.length < 4) return cardNumber;
    return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4);
  }

  static maskCVV(): string {
    return '***';
  }

  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local[0]}***@${domain}`;
  }
}
