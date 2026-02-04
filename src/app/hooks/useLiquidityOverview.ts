"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { defaultProtocols } from "../lib/liquidity/config";
import {
  buildSelectedDetail,
  getActiveProtocols,
  getBandPosition,
  getDefaultSelection,
  getMeteoraPools,
  getProtocolResult,
  getPumpswapPool,
  getPumpswapTvl,
  getRaydiumPools,
  getReserveSplit,
  getTotals,
  isPumpswapNotFound,
  getProtocolError,
} from "../lib/liquidity/selectors";
import type {
  LiquidityOverviewResponse,
  LiquidityProtocolResult,
  Protocol,
  SelectedPool,
} from "../lib/liquidity/types";

export type LiquidityState = {
  mintInput: string;
  protocols: Record<Protocol, boolean>;
  cluster: string;
  minTvlUsd: string;
  overview: LiquidityOverviewResponse | null;
  selected: SelectedPool | null;
  loading: boolean;
  error: string | null;
};

export type LiquidityDerived = {
  activeProtocols: Protocol[];
  raydiumResult: LiquidityProtocolResult | null;
  meteoraResult: LiquidityProtocolResult | null;
  pumpswapResult: LiquidityProtocolResult | null;
  raydiumPools: ReturnType<typeof getRaydiumPools>;
  meteoraPools: ReturnType<typeof getMeteoraPools>;
  pumpswapPool: ReturnType<typeof getPumpswapPool>;
  totals: ReturnType<typeof getTotals>;
  pumpswapTvl: ReturnType<typeof getPumpswapTvl>;
  selectedDetail: ReturnType<typeof buildSelectedDetail>;
  bandPosition: ReturnType<typeof getBandPosition>;
  reserveSplit: ReturnType<typeof getReserveSplit>;
  protocolErrors: {
    raydium: string | null;
    meteora: string | null;
    pumpswap: string | null;
  };
  pumpswapNotFound: boolean;
};

export type LiquidityActions = {
  setMintInput: (value: string) => void;
  toggleProtocol: (protocol: Protocol) => void;
  setCluster: (value: string) => void;
  setMinTvlUsd: (value: string) => void;
  selectPool: (protocol: Protocol, id: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function useLiquidityOverview(): {
  state: LiquidityState;
  derived: LiquidityDerived;
  actions: LiquidityActions;
} {
  const [mintInput, setMintInput] = useState("");
  const [protocols, setProtocols] = useState(defaultProtocols);
  const [cluster, setCluster] = useState("mainnet-beta");
  const [minTvlUsd, setMinTvlUsd] = useState("5000");
  const [overview, setOverview] = useState<LiquidityOverviewResponse | null>(null);
  const [selected, setSelected] = useState<SelectedPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProtocols = useMemo(() => getActiveProtocols(protocols), [protocols]);

  const raydiumResult = useMemo(() => getProtocolResult(overview, "raydium"), [overview]);
  const meteoraResult = useMemo(() => getProtocolResult(overview, "meteora"), [overview]);
  const pumpswapResult = useMemo(
    () => getProtocolResult(overview, "pumpswap"),
    [overview],
  );

  const raydiumPools = useMemo(() => getRaydiumPools(raydiumResult), [raydiumResult]);
  const meteoraPools = useMemo(() => getMeteoraPools(meteoraResult), [meteoraResult]);
  const pumpswapPool = useMemo(() => getPumpswapPool(pumpswapResult), [pumpswapResult]);

  useEffect(() => {
    if (!overview) return;
    setSelected(getDefaultSelection(raydiumPools, meteoraPools, pumpswapPool));
  }, [overview, raydiumPools, meteoraPools, pumpswapPool]);

  const totals = useMemo(
    () => getTotals(raydiumPools, meteoraResult, pumpswapPool),
    [raydiumPools, meteoraResult, pumpswapPool],
  );

  const pumpswapTvl = useMemo(() => getPumpswapTvl(pumpswapPool), [pumpswapPool]);

  const selectedDetail = useMemo(
    () => buildSelectedDetail(selected, raydiumPools, meteoraPools, pumpswapPool),
    [selected, raydiumPools, meteoraPools, pumpswapPool],
  );

  const bandPosition = useMemo(() => getBandPosition(selectedDetail), [selectedDetail]);
  const reserveSplit = useMemo(() => getReserveSplit(selectedDetail), [selectedDetail]);

  const protocolErrors = useMemo(
    () => ({
      raydium: getProtocolError(raydiumResult),
      meteora: getProtocolError(meteoraResult),
      pumpswap: getProtocolError(pumpswapResult),
    }),
    [raydiumResult, meteoraResult, pumpswapResult],
  );

  const pumpswapNotFound = useMemo(
    () => isPumpswapNotFound(pumpswapResult),
    [pumpswapResult],
  );

  const toggleProtocol = useCallback((protocol: Protocol) => {
    setProtocols((prev) => ({
      ...prev,
      [protocol]: !prev[protocol],
    }));
  }, []);

  const selectPool = useCallback((protocol: Protocol, id: string) => {
    setSelected({ protocol, id });
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const mint = mintInput.trim();
      if (!mint) {
        setError("Enter a Solana mint address.");
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("mint", mint);
      if (activeProtocols.length) {
        params.set("protocols", activeProtocols.join(","));
      }
      params.set("meteoraCluster", cluster);
      const minTvlValue = Number(minTvlUsd);
      if (Number.isFinite(minTvlValue)) {
        params.set("meteoraMinTvlUsd", String(minTvlValue));
      }

      try {
        const response = await fetch(`/api/liquidity?${params.toString()}`);
        const data = (await response.json()) as LiquidityOverviewResponse;
        if (!response.ok) {
          throw new Error((data as { message?: string }).message ?? "Failed to load");
        }
        setOverview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    },
    [mintInput, activeProtocols, cluster, minTvlUsd],
  );

  return {
    state: {
      mintInput,
      protocols,
      cluster,
      minTvlUsd,
      overview,
      selected,
      loading,
      error,
    },
    derived: {
      activeProtocols,
      raydiumResult,
      meteoraResult,
      pumpswapResult,
      raydiumPools,
      meteoraPools,
      pumpswapPool,
      totals,
      pumpswapTvl,
      selectedDetail,
      bandPosition,
      reserveSplit,
      protocolErrors,
      pumpswapNotFound,
    },
    actions: {
      setMintInput,
      toggleProtocol,
      setCluster,
      setMinTvlUsd,
      selectPool,
      handleSubmit,
    },
  };
}
