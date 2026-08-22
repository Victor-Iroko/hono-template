export interface TransactionRequest {
  email: string;
  amount: number; // in lowest currency unit (kobo/cents)
  currency?: string;
  reference?: string;
  callback_url?: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  bearer?: "account" | "subaccount";
  subaccount?: string;
  plan?: string;
  invoice_limit?: number;
  split_code?: string;
  transaction_charge?: number;
}

export interface TransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, unknown>;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

export interface ChargeCardRequest {
  authorization_code: string;
  email: string;
  amount: number;
  reference?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}

export interface ChargeCardResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    transaction_date: string;
    status: string;
    reference: string;
    domain: string;
    metadata: Record<string, unknown>;
    gateway_response: string;
    channel: string;
    ip_address: string;
  };
}

export interface AccountLookupResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

export interface ListBanksResponse {
  status: boolean;
  message: string;
  data: Array<{
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string | null;
    active: boolean;
    is_deleted: boolean;
    country: string;
    currency: string;
    type: string;
    id: number;
  }>;
}
