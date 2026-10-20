// v2 displays 1 credit where v1 displayed 1,000 coins, preserving purchasing power.
export const CREDIT_UNIT_VERSION = 2;
export const CREDIT_COSTS = {text:1,image:10,audio:10};
export const CREDIT_ALLOWANCES = {free:10,pro:1000,premium:3000};
export function creditUnits(value:number, version?:number) {
  return version === CREDIT_UNIT_VERSION ? value : value / 1000;
}
export function normalizedCosts(config:any = {}) {
  return Object.fromEntries(Object.entries(CREDIT_COSTS).map(([key,fallback])=>{
    const raw=config.costs?.[key];
    return [key,Number.isSafeInteger(raw)&&raw>0 ? Math.max(1,Math.ceil(creditUnits(raw,config.creditUnitVersion))) : fallback];
  })) as typeof CREDIT_COSTS;
}
export function normalizedAllowance(config:any, plan:keyof typeof CREDIT_ALLOWANCES) {
  const raw=config?.plans?.[plan]?.coinsPerMonth;
  return Number.isSafeInteger(raw)&&raw>0 ? Math.max(1,Math.ceil(creditUnits(raw,config.creditUnitVersion))) : CREDIT_ALLOWANCES[plan];
}
