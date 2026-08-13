import type { ImportDriver } from "./import-driver";
import { SimulationImportDriver } from "./simulate.driver";

/**
 * Selects the import driver. `IMPORT_DRIVER=simulate` is the default (and the
 * only one until the ERP-backed driver lands with the real integration in M5);
 * `IMPORT_SIMULATE_FAIL_EVERY_N` exercises the failed-rows path.
 */
export function createImportDriver(): ImportDriver {
  const failEveryN = Number(process.env.IMPORT_SIMULATE_FAIL_EVERY_N ?? 0);
  return new SimulationImportDriver(Number.isInteger(failEveryN) && failEveryN > 0 ? failEveryN : undefined);
}
