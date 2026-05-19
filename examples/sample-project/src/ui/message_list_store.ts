export class MessageListStore {
  private readonly messages = new Map<string, string>();

  setMessageStatus(messageId: string, state: "queued" | "sent" | "failed"): void {
    this.messages.set(messageId, state);
    ui.setMessageStatus(messageId, state);
  }
}

const ui = {
  setMessageStatus(messageId: string, state: string) {
    return `${messageId}:${state}`;
  }
};
