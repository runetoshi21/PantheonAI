import BN from "bn.js";
import Decimal from "decimal.js";
import { PublicKey } from "@solana/web3.js";

export function canonicalizePair(mintBase: PublicKey, mintQuote: PublicKey): {
  mintA: PublicKey;
  mintB: PublicKey;
  wasSwapped: boolean;
} {
  const baseBn = new BN(mintBase.toBuffer());
  const quoteBn = new BN(mintQuote.toBuffer());

  if (baseBn.gt(quoteBn)) {
    return { mintA: mintQuote, mintB: mintBase, wasSwapped: true };
  }

  return { mintA: mintBase, mintB: mintQuote, wasSwapped: false };
}

export function computeInitialPriceForSdk(
  userPriceQuotePerBase: Decimal,
  wasSwapped: boolean
): Decimal {
  if (!wasSwapped) return userPriceQuotePerBase;
  return new Decimal(1).div(userPriceQuotePerBase);
}
