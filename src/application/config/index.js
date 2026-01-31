import { RotationConfig } from "./RotationConfig.js";
import { RotationState } from "./RotationState.js";

export const configManager = RotationConfig.getInstance({ state: RotationState });
