import type { AppConfig } from "../config/index.js";
import type { EvmRpc } from "../infra/evm-rpc.js";
import { analyzeTransaction, AnalyzeValidationError } from "../application/analyze-transaction.js";
import { analyzeRequestBodySchema } from "../domain/policy.js";
import { PROFILES } from "../policy/profiles.js";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpDeps = {
  config: AppConfig;
  createRpc: () => EvmRpc;
};

const TOOLS: McpTool[] = [
  {
    name: "baret_analyze",
    description:
      "Analyze an EVM transaction before signing. Returns safe:true/false, risk findings, estimated balance + approval changes, and a human-readable summary.",
    inputSchema: {
      type: "object",
      required: ["network", "transaction"],
      properties: {
        network: { type: "string", enum: ["testnet", "mainnet"] },
        transaction: {
          description: "Raw 0x-hex serialized tx OR a tx-request object {from,to,value,data,...}",
        },
        userWallet: { type: "string", description: "0x address to attribute changes to" },
        policy: { type: "object" },
      },
    },
  },
  {
    name: "baret_health",
    description: "Returns Baret service status and the active network.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "baret_list_profiles",
    description: "List the server-side policy profiles (strict / balanced / permissive).",
    inputSchema: { type: "object", properties: {} },
  },
];

export class McpServer {
  constructor(private readonly deps: McpDeps) {}

  listTools(): McpTool[] {
    return TOOLS;
  }

  async call(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case "baret_analyze": {
        const parsed = analyzeRequestBodySchema.safeParse(args);
        if (!parsed.success) {
          throw new AnalyzeValidationError(
            `Invalid baret_analyze args: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
          );
        }
        return analyzeTransaction(parsed.data, this.deps);
      }
      case "baret_health":
        return {
          status: "ok",
          network: this.deps.config.chain.network,
          chainId: this.deps.config.chain.chainId,
        };
      case "baret_list_profiles":
        return { profiles: PROFILES };
      default:
        throw new AnalyzeValidationError(`Unknown MCP tool: ${name}`);
    }
  }
}
