export type ClmmConfig = {
  id: string;
  index?: number;
  tickSpacing?: number;
  tradeFeeRate?: number;
  protocolFeeRate?: number;
  fundFeeRate?: number;
  description?: string;
  defaultRange?: number;
  defaultRangePoint?: number[];
};

export type ClmmConfigSelection =
  | { configId: string }
  | { tickSpacing: number; tradeFeeRate?: number }
  | { tradeFeeRate: number; tickSpacing?: number };
