import type { ContactRepository } from "../persistence/contact_repository";
import type { DeliveryReceiptRepository } from "../persistence/delivery_receipt_repository";
import type { DirectMessageProtocol } from "../protocol/direct_message_protocol";
import type { Sx1262RadioDriver } from "../hardware/sx1262_radio_driver";
import type { MessageListStore } from "../ui/message_list_store";

export interface SendDirectMessageDependencies {
  contacts: ContactRepository;
  receipts: DeliveryReceiptRepository;
  protocol: DirectMessageProtocol;
  radio: Sx1262RadioDriver;
  messageList: MessageListStore;
}

export class DirectMessageWorkflow {
  constructor(private readonly dependencies: SendDirectMessageDependencies) {}

  sendDirectMessage(contactId: string, messageId: string, body: string): void {
    const contact = this.dependencies.contacts.findContact(contactId);
    const packet = this.dependencies.protocol.encodeDirectMessage(contact.radioAddress, body);

    this.dependencies.radio.send(packet);
    this.dependencies.receipts.insertDeliveryReceipt(messageId, "sent");
    this.dependencies.messageList.setMessageStatus(messageId, "sent");
  }
}
