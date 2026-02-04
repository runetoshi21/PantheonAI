import { CLMM_PROGRAM_ID, DEVNET_PROGRAM_ID, PositionInfoLayout, getPdaPersonalPositionAddress } from "@raydium-io/raydium-sdk-v2";
import type { ClmmPositionLayout } from "@raydium-io/raydium-sdk-v2";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { raydiumConfig } from "../../../config/raydium";
import { ClmmError } from "./errors";

export type LoadedPosition = {
  poolId: PublicKey;
  positionAddress: PublicKey;
  positionNftMint: PublicKey;
  tickLowerIndex: number;
  tickUpperIndex: number;
  liquidity: bigint;
  position: ClmmPositionLayout;
};

export async function loadPositionByNftMint(params: {
  connection: Connection;
  owner: PublicKey;
  positionNftMint: PublicKey;
}): Promise<LoadedPosition> {
  const { connection, owner, positionNftMint } = params;
  const programId =
    raydiumConfig.RAYDIUM_CLUSTER === "devnet" ? DEVNET_PROGRAM_ID.CLMM : CLMM_PROGRAM_ID;

  const positionAddress = getPdaPersonalPositionAddress(programId, positionNftMint).publicKey;
  const positionAccount = await connection.getAccountInfo(positionAddress);
  if (!positionAccount) {
    throw new ClmmError("INVALID_INPUT", 400, "Position account not found", {
      positionAddress: positionAddress.toBase58()
    });
  }

  const position = PositionInfoLayout.decode(positionAccount.data) as ClmmPositionLayout;

  await assertPositionOwner({ connection, owner, positionNftMint });

  return {
    poolId: position.poolId,
    positionAddress,
    positionNftMint,
    tickLowerIndex: position.tickLower,
    tickUpperIndex: position.tickUpper,
    liquidity: BigInt(position.liquidity.toString()),
    position
  };
}

async function assertPositionOwner(params: {
  connection: Connection;
  owner: PublicKey;
  positionNftMint: PublicKey;
}): Promise<void> {
  const { connection, owner, positionNftMint } = params;
  const mintAccount = await connection.getAccountInfo(positionNftMint);
  if (!mintAccount) {
    throw new ClmmError("INVALID_INPUT", 400, "Position NFT mint not found", {
      positionNftMint: positionNftMint.toBase58()
    });
  }

  const tokenProgramId = mintAccount.owner;
  const ata = getAssociatedTokenAddressSync(
    positionNftMint,
    owner,
    false,
    tokenProgramId.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  try {
    const balance = await connection.getTokenAccountBalance(ata);
    if (balance.value.amount !== "1") {
      throw new ClmmError("NOT_POSITION_OWNER", 403, "Owner does not hold position NFT", {
        owner: owner.toBase58(),
        positionNftMint: positionNftMint.toBase58()
      });
    }
  } catch (error) {
    if (error instanceof ClmmError) throw error;
    throw new ClmmError("NOT_POSITION_OWNER", 403, "Owner does not hold position NFT", {
      owner: owner.toBase58(),
      positionNftMint: positionNftMint.toBase58()
    });
  }
}
