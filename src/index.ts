import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createProviderConfig, PROVIDER_ID } from "./provider.ts";

export default function fortytwo(pi: ExtensionAPI): void {
  pi.registerProvider(PROVIDER_ID, createProviderConfig());

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.setStatus(PROVIDER_ID, ctx.model?.provider === PROVIDER_ID ? ctx.ui.theme.fg("dim", "Powered by Fortytwo") : undefined);
  });

  pi.on("model_select", (event, ctx) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.setStatus(PROVIDER_ID, event.model.provider === PROVIDER_ID ? ctx.ui.theme.fg("dim", "Powered by Fortytwo") : undefined);
  });
}
