// src/types/oee.ts
export interface PercentSetting {
    type: string;
    settings: {
        low: number;
        medium: number;
        high: number;
    };
}

export interface OEEItem {
    id: number;
    oeeBatchId: number | null;
    oeeCode: string;
    productionName: string;
    actual: number;
    defect: number;
    plan: number | null;
    target: number;
    oeePercent: number;
    lotNumber: string | null;
    batchStatus: string | null;
    startDate: string | null;
    endDate: string | null;
    useSitePercentSettings: number;
    percentSettings: PercentSetting[] | null;
    standardSpeedSeconds: number | null;
    productName: string;
    batchStartedDate: string | null;
    batchStoppedDate: string | null;
    activeSecondUnit: number;
}

export interface APIData {
    running: string;
    breakdown: string;
    ended: string;
    standby: string;
    mcSetup: string;
    oees: OEEItem[];
}

export interface OEEData {
    running: number;
    breakdown: number;
    ended: number;
    standby: number;
    mcSetup: number;
    oees: OEEItem[];
}
