import { KNOWN_CLUSTER_NAMES, CLUSTERS } from "./clusters";
import { checkIsValidURL, encodeURL } from "./url";

export const getExplorerLinkFactory = (clusterNameOrURL: string) => {
  /**
   * Gets a link to view an address, transaction, or block on Solana Explorer.
   * The link will automatically use the current RPC configuration.
   * @param {("transaction" | "tx" | "address" | "block")} linkType - Type of entity to link to
   * @param {string} id - The address, signature, or block to link to
   * @returns {string} The complete Solana Explorer URL
   */
  const getExplorerLink = (linkType: "transaction" | "tx" | "address" | "block", id: string): string => {
    const searchParams: Record<string, string> = {};
    if (KNOWN_CLUSTER_NAMES.includes(clusterNameOrURL)) {
      const clusterDetails = CLUSTERS[clusterNameOrURL];
      // If they're using Solana Labs mainnet-beta, we don't need to include the cluster name in the Solana Explorer URL
      // because it's the default
      if (!clusterDetails.features.isExplorerDefault) {
        if (clusterDetails.features.isNameKnownToSolanaExplorer) {
          searchParams["cluster"] = clusterNameOrURL;
        } else {
          searchParams["cluster"] = "custom";
        }
        // We don't have to set searchParams["customUrl"] for localnet - Explorer will connect to localnet by default
        if (clusterNameOrURL !== "localnet") {
          // set requiredParam=requiredParamEnvironmentVariable if we need to
          if (clusterDetails.requiredParam) {
            const requiredParamEnvironmentVariable = clusterDetails.requiredParamEnvironmentVariable;
            if (!requiredParamEnvironmentVariable) {
              throw new Error(`Required param environment variable is not set for cluster ${clusterNameOrURL}`);
            }
            if (!process.env[requiredParamEnvironmentVariable]) {
              throw new Error(`Environment variable '${requiredParamEnvironmentVariable}' is not set.`);
            }
            const apiKey = process.env[requiredParamEnvironmentVariable];

            const params = new URLSearchParams({
              [clusterDetails.requiredParam]: apiKey,
            });
            const urlWithParams = `${clusterDetails.httpURL}?${params.toString()}`;
            searchParams["customUrl"] = urlWithParams;
          } else if (!clusterDetails.httpURL) {
            // If we don't have a param to know the URL, we need to set the custom URL
            throw new Error(
              `Please set either httpUrl or requiredParam for cluster ${clusterNameOrURL} in clusters.ts`,
            );
          } else if (!clusterDetails.features.isNameKnownToSolanaExplorer) {
            // Only set customUrl if we don't have a requiredParam and the cluster is not known to Solana Explorer
            searchParams["customUrl"] = clusterDetails.httpURL;
          }
        }
      }
    } else {
      if (checkIsValidURL(clusterNameOrURL)) {
        searchParams["cluster"] = "custom";
        searchParams["customUrl"] = clusterNameOrURL;
      } else {
        throw new Error(`Unsupported cluster name: ${clusterNameOrURL}`);
      }
    }

    let baseUrl: string = "";
    if (linkType === "address") {
      baseUrl = `https://explorer.solana.com/address/${id}`;
    }
    if (linkType === "transaction" || linkType === "tx") {
      baseUrl = `https://explorer.solana.com/tx/${id}`;
    }
    if (linkType === "block") {
      baseUrl = `https://explorer.solana.com/block/${id}`;
    }
    return encodeURL(baseUrl, searchParams);
  };

  return getExplorerLink;
};
