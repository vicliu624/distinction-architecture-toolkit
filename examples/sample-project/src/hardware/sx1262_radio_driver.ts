import type { RadioPacket } from "../protocol/direct_message_protocol";

export class Sx1262RadioDriver {
  send(packet: RadioPacket): number {
    gpio.setMode("DIO1", "output");
    sx1262.writePayload(packet.bytes);
    sx1262.setTxMode();
    return packet.bytes.length;
  }
}

const gpio = {
  setMode(pin: string, mode: "input" | "output") {
    return `${pin}:${mode}`;
  }
};

const sx1262 = {
  writePayload(bytes: Uint8Array) {
    return bytes.length;
  },
  setTxMode() {
    return "tx";
  }
};
