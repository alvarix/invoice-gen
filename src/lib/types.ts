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
  portal_token: string | null;
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
  notes: string | null;
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

export interface Agreement {
  id: string;
  client_id: string;
  title: string;
  content: string | null;
  status: 'draft' | 'sent' | 'accepted';
  public_token: string;
  sent_at: string | null;
  accepted_at: string | null;
  accepted_ip: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
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
