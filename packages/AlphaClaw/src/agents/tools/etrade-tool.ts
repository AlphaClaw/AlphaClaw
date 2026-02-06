import { Type } from "@sinclair/typebox";
import crypto from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";

const ETRADE_API_BASE = "https://api.etrade.com";
const ETRADE_SANDBOX_BASE = "https://apisb.etrade.com";

const MAX_QUOTE_SYMBOLS = 25;

const ETradeSchema = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list_accounts"),
      Type.Literal("get_balance"),
      Type.Literal("get_positions"),
      Type.Literal("get_quote"),
    ],
    {
      description:
        "Action to perform: list_accounts, get_balance (requires account_id_key), get_positions (requires account_id_key), get_quote (requires symbols).",
    },
  ),
  account_id_key: Type.Optional(
    Type.String({
      description: "E*TRADE account ID key. Required for get_balance and get_positions.",
    }),
  ),
  symbols: Type.Optional(
    Type.String({
      description:
        "Comma-separated stock symbols for get_quote (max 25). Example: 'AAPL,MSFT,TSLA'.",
    }),
  ),
});

type OAuthCredentials = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

function resolveCredentials(): OAuthCredentials | undefined {
  const consumerKey = process.env.ETRADE_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.ETRADE_CONSUMER_SECRET?.trim();
  const accessToken = process.env.ETRADE_ACCESS_TOKEN?.trim();
  const accessTokenSecret = process.env.ETRADE_ACCESS_TOKEN_SECRET?.trim();
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return undefined;
  }
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

function resolveBaseUrl(): string {
  return process.env.ETRADE_SANDBOX === "1" ? ETRADE_SANDBOX_BASE : ETRADE_API_BASE;
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function signRequest(
  method: string,
  url: string,
  creds: OAuthCredentials,
  params: Record<string, string> = {},
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_token: creds.accessToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: generateNonce(),
    oauth_version: "1.0",
    ...params,
  };

  // Combine all params, sort, build base string
  const allParams = { ...oauthParams };
  const parsedUrl = new URL(url);
  for (const [k, v] of parsedUrl.searchParams.entries()) {
    allParams[k] = v;
  }

  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");

  const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
  const baseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  const signingKey = `${percentEncode(creds.consumerSecret)}&${percentEncode(creds.accessTokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  oauthParams.oauth_signature = signature;

  const authHeader = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${authHeader}`;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

async function etradeRequest(method: string, path: string, creds: OAuthCredentials): Promise<unknown> {
  const baseUrl = resolveBaseUrl();
  const url = `${baseUrl}${path}`;
  const authorization = signRequest(method, url, creds);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      Accept: "application/xml",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`E*TRADE API error (${res.status}): ${body || res.statusText}`);
  }

  const text = await res.text();
  return xmlParser.parse(text);
}

function formatAccounts(data: unknown): Record<string, unknown> {
  const root = data as Record<string, unknown>;
  const response = root.AccountListResponse as Record<string, unknown> | undefined;
  const accounts = response?.Accounts as Record<string, unknown> | undefined;
  let accountList = accounts?.Account;
  if (!Array.isArray(accountList)) {
    accountList = accountList ? [accountList] : [];
  }
  return {
    accounts: (accountList as Record<string, unknown>[]).map((a) => ({
      accountIdKey: a.accountIdKey,
      accountId: a.accountId,
      accountName: a.accountName ?? a.accountDesc,
      accountType: a.accountType ?? a.institutionType,
      accountStatus: a.accountStatus,
    })),
  };
}

function formatBalance(data: unknown): Record<string, unknown> {
  const root = data as Record<string, unknown>;
  const response = root.BalanceResponse as Record<string, unknown> | undefined;
  if (!response) {
    return { error: "no_balance_data", raw: root };
  }
  const computed = response.Computed as Record<string, unknown> | undefined;
  return {
    accountId: response.accountId,
    accountType: response.accountType,
    cash: {
      cashAvailableForInvestment: computed?.cashAvailableForInvestment,
      cashAvailableForWithdrawal: computed?.cashAvailableForWithdrawal,
      cashBalance: computed?.cashBalance,
      settledCashForInvestment: computed?.settledCashForInvestment,
    },
    margin: {
      marginBuyingPower: computed?.marginBuyingPower,
      cashBuyingPower: computed?.cashBuyingPower,
    },
    portfolio: {
      totalAccountValue: computed?.RealTimeValues?.totalAccountValue ?? computed?.totalAccountValue,
      netMv: computed?.netMv,
      netMvLong: computed?.netMvLong,
      netMvShort: computed?.netMvShort,
    },
  };
}

function formatPositions(data: unknown): Record<string, unknown> {
  const root = data as Record<string, unknown>;
  const response = root.PortfolioResponse as Record<string, unknown> | undefined;
  const accountPortfolio = response?.AccountPortfolio;
  let portfolioList = Array.isArray(accountPortfolio) ? accountPortfolio : accountPortfolio ? [accountPortfolio] : [];
  const positions: Record<string, unknown>[] = [];
  for (const portfolio of portfolioList as Record<string, unknown>[]) {
    let positionList = portfolio.Position;
    if (!Array.isArray(positionList)) {
      positionList = positionList ? [positionList] : [];
    }
    for (const pos of positionList as Record<string, unknown>[]) {
      const product = pos.Product as Record<string, unknown> | undefined;
      positions.push({
        symbol: product?.symbol ?? pos.symbolDescription,
        securityType: product?.securityType,
        quantity: pos.quantity,
        costPerShare: pos.costPerShare ?? pos.pricePaid,
        marketValue: pos.marketValue,
        totalCost: pos.totalCost,
        totalGain: pos.totalGain,
        totalGainPct: pos.totalGainPct,
        daysGain: pos.daysGain,
        daysGainPct: pos.daysGainPct,
        currentPrice: pos.currentPrice,
      });
    }
  }
  return { positions };
}

function formatQuotes(data: unknown): Record<string, unknown> {
  const root = data as Record<string, unknown>;
  const response = root.QuoteResponse as Record<string, unknown> | undefined;
  let quoteList = response?.QuoteData;
  if (!Array.isArray(quoteList)) {
    quoteList = quoteList ? [quoteList] : [];
  }
  return {
    quotes: (quoteList as Record<string, unknown>[]).map((q) => {
      const all = q.All as Record<string, unknown> | undefined;
      const product = q.Product as Record<string, unknown> | undefined;
      return {
        symbol: product?.symbol ?? q.symbol,
        lastTrade: all?.lastTrade,
        changeClose: all?.changeClose,
        changeClosePercentage: all?.changeClosePercentage,
        bid: all?.bid,
        ask: all?.ask,
        bidSize: all?.bidSize,
        askSize: all?.askSize,
        volume: all?.totalVolume ?? all?.volume,
        open: all?.open,
        high: all?.high,
        low: all?.low,
        previousClose: all?.previousClose,
        high52: all?.high52,
        low52: all?.low52,
        marketCap: all?.marketCap,
        pe: all?.pe,
        eps: all?.eps,
        dividend: all?.dividend,
        yield: all?.yield,
      };
    }),
  };
}

export function createETradeTool(): AnyAgentTool | null {
  const creds = resolveCredentials();
  if (!creds) {
    return null;
  }

  return {
    label: "E*TRADE",
    name: "etrade",
    description:
      "Query E*TRADE brokerage accounts. Supports: list_accounts (list all linked accounts), get_balance (cash/margin/buying power for an account), get_positions (portfolio holdings with gain/loss), get_quote (real-time quotes for up to 25 symbols).",
    parameters: ETradeSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });

      switch (action) {
        case "list_accounts": {
          const data = await etradeRequest("GET", "/v1/accounts/list", creds);
          return jsonResult(formatAccounts(data));
        }
        case "get_balance": {
          const accountIdKey = readStringParam(params, "account_id_key", { required: true });
          const data = await etradeRequest(
            "GET",
            `/v1/accounts/${encodeURIComponent(accountIdKey)}/balance?instType=BROKERAGE&realTimeNAV=true`,
            creds,
          );
          return jsonResult(formatBalance(data));
        }
        case "get_positions": {
          const accountIdKey = readStringParam(params, "account_id_key", { required: true });
          const data = await etradeRequest(
            "GET",
            `/v1/accounts/${encodeURIComponent(accountIdKey)}/portfolio`,
            creds,
          );
          return jsonResult(formatPositions(data));
        }
        case "get_quote": {
          const symbolsRaw = readStringParam(params, "symbols", { required: true });
          const symbols = symbolsRaw
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, MAX_QUOTE_SYMBOLS);
          if (symbols.length === 0) {
            return jsonResult({ error: "no_symbols", message: "Provide at least one stock symbol." });
          }
          const data = await etradeRequest("GET", `/v1/market/quote/${symbols.join(",")}`, creds);
          return jsonResult(formatQuotes(data));
        }
        default:
          return jsonResult({
            error: "unknown_action",
            message: `Unknown action '${action}'. Use list_accounts, get_balance, get_positions, or get_quote.`,
          });
      }
    },
  };
}
