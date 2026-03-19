export interface Client {
  id: string;
  slug: string;
  name: string;
  company: string | null;
  project: string | null;
  email: string | null;
  hourly_rate: number;
  currency: string;
  tax_rate: number;
  invoice_seq: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid';
  paid_date: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  public_token: string;
  created_at: string;
}

export interface LineItem {
  id: string;
  invoice_id: string;
  type: 'time' | 'expense';
  description: string;
  duration_raw: string | null;
  duration_rounded: string | null;
  rate: number | null;
  amount: number;
  sort_order: number;
}

export interface Settings {
  id: number;
  owner_name: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  zelle: string | null;
  logo_url: string | null;
}
