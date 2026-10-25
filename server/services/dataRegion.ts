import { parseRegionDeployment } from "@shared/dataRegions";

/**
 * Контур этой установки (#17, docs/DATA-REGIONS.md): DATA_REGION — какой это контур (ru по умолчанию),
 * DATA_REGION_URLS — адреса остальных открытых контуров, «eu=https://…,world=https://…».
 */
export const regionDeployment = parseRegionDeployment(process.env.DATA_REGION, process.env.DATA_REGION_URLS);
