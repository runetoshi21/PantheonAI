"use client";

import {
  DiagnosticsPanel,
  KpiStrip,
  LiquidityForm,
  LiquidityHeader,
  MeteoraPanel,
  PumpSwapPanel,
  RaydiumPanel,
  SelectedPoolPanel,
} from "../components/liquidity";
import { useLiquidityOverview } from "../hooks/useLiquidityOverview";

export default function Home() {
  const { state, derived, actions } = useLiquidityOverview();
  const { mintInput, protocols, cluster, minTvlUsd, overview, selected, loading, error } =
    state;
  const {
    activeProtocols,
    raydiumPools,
    meteoraPools,
    pumpswapPool,
    totals,
    pumpswapTvl,
    selectedDetail,
    reserveSplit,
    protocolErrors,
    pumpswapNotFound,
  } = derived;
  const { setMintInput, toggleProtocol, setMinTvlUsd, selectPool, handleSubmit } = actions;

  return (
    <div className="terminal-shell">
      <div className="mx-auto w-full max-w-[1320px] px-6 pt-10">
        <LiquidityHeader
          cluster={cluster}
          fetchedAtUnixMs={overview?.fetchedAtUnixMs ?? null}
        />

        <section className="panel mt-8 p-6">
          <LiquidityForm
            mintInput={mintInput}
            protocols={protocols}
            minTvlUsd={minTvlUsd}
            loading={loading}
            onMintChange={setMintInput}
            onToggleProtocol={toggleProtocol}
            onMinTvlUsdChange={setMinTvlUsd}
            onSubmit={handleSubmit}
          />
          <KpiStrip
            activeProtocols={activeProtocols.length}
            pools={totals.pools}
            totalTvl={totals.tvl}
            loading={loading}
            hasOverview={Boolean(overview)}
            error={error}
          />
        </section>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <RaydiumPanel
              enabled={protocols.raydium}
              pools={raydiumPools}
              selected={selected}
              error={protocolErrors.raydium}
              onSelect={(id) => selectPool("raydium", id)}
            />
            <MeteoraPanel
              enabled={protocols.meteora}
              pools={meteoraPools}
              selected={selected}
              error={protocolErrors.meteora}
              onSelect={(id) => selectPool("meteora", id)}
            />
            <PumpSwapPanel
              enabled={protocols.pumpswap}
              pool={pumpswapPool}
              selected={selected}
              error={protocolErrors.pumpswap}
              notFound={pumpswapNotFound}
              tvl={pumpswapTvl}
              onSelect={(id) => selectPool("pumpswap", id)}
            />
          </div>

          <aside className="flex flex-col gap-6">
            <SelectedPoolPanel
              detail={selectedDetail}
              reserveSplit={reserveSplit}
            />
            <DiagnosticsPanel
              raydiumPools={raydiumPools.length}
              meteoraPools={meteoraPools.length}
              pumpswapOnline={Boolean(pumpswapPool)}
              inputMint={overview?.inputMint}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
