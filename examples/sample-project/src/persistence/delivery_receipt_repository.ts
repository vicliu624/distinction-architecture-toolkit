export class DeliveryReceiptRepository {
  insertDeliveryReceipt(messageId: string, state: "queued" | "sent" | "failed"): void {
    sqlite.deliveryReceipts.push({
      messageId,
      state,
      storedAt: new Date().toISOString()
    });
  }
}

const sqlite = {
  deliveryReceipts: [] as Array<{ messageId: string; state: string; storedAt: string }>
};
