export interface ContactRecord {
  id: string;
  radioAddress: string;
}

export class ContactRepository {
  findContact(id: string): ContactRecord {
    const row = sqlite.contacts.find((contact) => contact.id === id);
    if (!row) throw new Error(`contact not found: ${id}`);
    return row;
  }
}

const sqlite = {
  contacts: [
    { id: "contact-1", radioAddress: "trail-node-17" },
    { id: "contact-2", radioAddress: "trail-node-24" }
  ]
};
