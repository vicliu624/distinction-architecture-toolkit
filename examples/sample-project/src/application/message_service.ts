import { DirectMessageWorkflow } from "./send_direct_message_workflow";
import { ContactRepository } from "../persistence/contact_repository";
import { DeliveryReceiptRepository } from "../persistence/delivery_receipt_repository";
import { DirectMessageProtocol } from "../protocol/direct_message_protocol";
import { Sx1262RadioDriver } from "../hardware/sx1262_radio_driver";
import { MessageListStore } from "../ui/message_list_store";

export class MessageService {
  private readonly workflow = new DirectMessageWorkflow({
    contacts: new ContactRepository(),
    receipts: new DeliveryReceiptRepository(),
    protocol: new DirectMessageProtocol(),
    radio: new Sx1262RadioDriver(),
    messageList: new MessageListStore()
  });

  sendDirectMessage(contactId: string, messageId: string, body: string): void {
    this.workflow.sendDirectMessage(contactId, messageId, body);
  }
}
