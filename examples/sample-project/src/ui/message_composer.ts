import { MessageService } from "../application/message_service";

const messageService = new MessageService();

export function onSendButtonClicked(contactId: string, body: string): void {
  const messageId = crypto.randomUUID();
  messageService.sendDirectMessage(contactId, messageId, body);
}
