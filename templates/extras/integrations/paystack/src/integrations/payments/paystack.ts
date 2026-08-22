import { createHmac, timingSafeEqual } from "node:crypto";
import { ofetch, type $Fetch } from "ofetch";
import type {
  AccountLookupResponse,
  ChargeCardRequest,
  ChargeCardResponse,
  ListBanksResponse,
  TransactionRequest,
  TransactionResponse,
  VerifyTransactionResponse,
} from "./types.js";

const BASE_URL = "https://api.paystack.co";

let fetchClient: $Fetch | null = null;

function getPaystackSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY || "sk_test_replace_with_your_paystack_secret";
}

export function getPaystackClient(): $Fetch {
  if (!fetchClient) {
    fetchClient = ofetch.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
        "Content-Type": "application/json",
      },
    });
  }
  return fetchClient;
}

export async function initializeTransaction(
  body: TransactionRequest
): Promise<TransactionResponse> {
  const payload: Record<string, unknown> = {
    email: body.email,
    amount: body.amount,
  };
  if (body.currency) payload.currency = body.currency;
  if (body.reference) payload.reference = body.reference;
  if (body.callback_url) payload.callback_url = body.callback_url;
  if (body.channels) payload.channels = body.channels;
  if (body.metadata) payload.metadata = JSON.stringify(body.metadata);
  if (body.bearer) payload.bearer = body.bearer;
  if (body.subaccount) payload.subaccount = body.subaccount;
  if (body.plan) payload.plan = body.plan;
  if (body.invoice_limit) payload.invoice_limit = body.invoice_limit;
  if (body.split_code) payload.split_code = body.split_code;
  if (body.transaction_charge) payload.transaction_charge = body.transaction_charge;

  return await getPaystackClient()<TransactionResponse>("/transaction/initialize", {
    method: "POST",
    body: payload,
  });
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
  return await getPaystackClient()<VerifyTransactionResponse>(`/transaction/verify/${reference}`);
}

export async function chargeCard(body: ChargeCardRequest): Promise<ChargeCardResponse> {
  const payload: Record<string, unknown> = {
    authorization_code: body.authorization_code,
    email: body.email,
    amount: body.amount,
  };
  if (body.reference) payload.reference = body.reference;
  if (body.currency) payload.currency = body.currency;
  if (body.metadata) payload.metadata = JSON.stringify(body.metadata);
  if (body.channels) payload.channels = body.channels;

  return await getPaystackClient()<ChargeCardResponse>("/transaction/charge_authorization", {
    method: "POST",
    body: payload,
  });
}

export function verifyWebhookSignature(payload: string | ArrayBuffer, signature: string): boolean {
  try {
    const rawBody = typeof payload === "string" ? payload : new TextDecoder().decode(payload);
    const expected = createHmac("sha512", getPaystackSecretKey()).update(rawBody).digest("hex");
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function accountLookup(
  bankCode: string,
  accountNumber: string
): Promise<AccountLookupResponse> {
  return await getPaystackClient()<AccountLookupResponse>(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  );
}

export async function listBanks(): Promise<ListBanksResponse> {
  return await getPaystackClient()<ListBanksResponse>("/bank");
}

export const paystack = {
  initializeTransaction,
  verifyTransaction,
  chargeCard,
  verifyWebhookSignature,
  accountLookup,
  listBanks,
  getClient: getPaystackClient,
};
