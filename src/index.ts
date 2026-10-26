import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createProviderConfig, PROVIDER_ID } from "./provider.ts";

export default function fortytwo(pi: ExtensionAPI): void {
  pi.registerProvider(PROVIDER_ID, createProviderConfig());
}
