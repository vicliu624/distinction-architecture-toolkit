export interface RadioPacket {
  bytes: Uint8Array;
}

export class DirectMessageProtocol {
  encodeDirectMessage(radioAddress: string, body: string): RadioPacket {
    const payload = JSON.stringify({
      protocol: "trail.direct-message.v1",
      radioAddress,
      body
    });
    return { bytes: new TextEncoder().encode(payload) };
  }
}
