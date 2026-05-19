import { MessageService } from "../application/message_service";

export function smokeSendDirectMessage(): void {
  const service = new MessageService();
  service.sendDirectMessage("contact-1", "smoke-1", "ping");
}
