import { BenchDriver } from "./bench.driver";
import { SimulationDriver } from "./simulate.driver";
import type { ProvisioningDriver } from "./provisioning-driver";

/**
 * Selects the provisioning driver. `PROVISIONING_DRIVER=bench|simulate`
 * overrides the default; without an override, development defaults to the
 * simulated driver (no ERP cluster required) and production to the real
 * bench driver.
 */
export function createProvisioningDriver(): ProvisioningDriver {
  const mode = process.env.PROVISIONING_DRIVER;
  if (mode === "bench") return new BenchDriver();
  if (mode === "simulate") {
    return new SimulationDriver(process.env.PROVISIONING_SIMULATE_FAIL_STEP);
  }
  return process.env.NODE_ENV === "production" ? new BenchDriver() : new SimulationDriver();
}
