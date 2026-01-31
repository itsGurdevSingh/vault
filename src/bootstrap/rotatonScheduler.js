import { RotationScheduler } from "../application/services/rotationService/rotationScheduler.js";
import { rotationPolicyAdapter as rotationPolicy } from '../infrastructure/adapters/index.js';

export const createRotationSchedulerServices = (keyRotator, configManager) => {
    const configState = configManager.getConfig();
    return new RotationScheduler(
        keyRotator,
        rotationPolicy,
        configState
    );
};
