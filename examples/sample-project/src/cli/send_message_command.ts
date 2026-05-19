import { MessageService } from "../application/message_service";

const messageService = new MessageService();

export function runSendMessageCommand(argv: string[]): void {
  const [, , contactId = "contact-1", body = "hello trail"] = argv;
  messageService.sendDirectMessage(contactId, `cli-${Date.now()}`, body);
}
