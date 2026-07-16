import type { AppConfig } from "../../config/index.js";
import type { EvmRpc } from "../../infra/evm-rpc.js";

export type RouteDeps = {
  config: AppConfig;
  createRpc: () => EvmRpc;
};
