export interface GuestData {
  id: string;
  name: string;
  phone: string;
  email: string;
  previousStays: number;
  notes: string;
}

export class Guest {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly previousStays: number;
  readonly notes: string;

  constructor(data: GuestData) {
    this.id = data.id;
    this.name = data.name;
    this.phone = data.phone;
    this.email = data.email;
    this.previousStays = data.previousStays;
    this.notes = data.notes;
  }

  fullName(): string {
    return this.name;
  }

  hasStayedBefore(): boolean {
    return this.previousStays > 0;
  }

  toData(): GuestData {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      previousStays: this.previousStays,
      notes: this.notes,
    };
  }
}
