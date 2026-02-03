export type RaydiumPoolKind = "standard" | "concentrated" | "cpmm" | "unknown";

export interface RaydiumTokenDto {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  logoURI?: string;
}

export interface RaydiumPoolMetricsDto {
  price?: string;
  tvl?: string;
  feeRate?: string;
  mintAmountA?: string;
  mintAmountB?: string;
  mintAmountAUsd?: string;
  mintAmountBUsd?: string;
  volume24h?: string;
  fee24h?: string;
  apr24h?: string;
  volume7d?: string;
  fee7d?: string;
  apr7d?: string;
  volume30d?: string;
  fee30d?: string;
  apr30d?: string;
}

export interface RaydiumPoolKeysDto {
  id: string;
  kind: RaydiumPoolKind;
  vaultA?: string;
  vaultB?: string;
  raw: unknown;
}

export interface RaydiumVaultBalanceDto {
  address: string;
  amountRaw: string;
  amount: string;
}

export interface RaydiumPoolDto {
  id: string;
  kind: RaydiumPoolKind;
  programId?: string;
  mintA: RaydiumTokenDto;
  mintB: RaydiumTokenDto;
  metrics: RaydiumPoolMetricsDto;
  keys?: RaydiumPoolKeysDto;
  vaultBalances?: {
    vaultA?: RaydiumVaultBalanceDto;
    vaultB?: RaydiumVaultBalanceDto;
    fetchedAtUnixMs: number;
  };
}

export interface RaydiumPoolsByMintResponseDto {
  inputMint: string;
  fetchedAtUnixMs: number;
  pools: RaydiumPoolDto[];
}
