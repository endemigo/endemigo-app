import districtData from './ilceler.json';
import provinceData from './iller.json';

interface ProvinceItem {
  id: number;
  name: string;
}

interface DistrictItem {
  id: number;
  ilId: number;
  name: string;
}

const provinces = provinceData as ProvinceItem[];
const districts = districtData as DistrictItem[];

export const TURKISH_PROVINCES = provinces.map((item) => item.name);

const provinceIdByName = new Map<string, number>(
  provinces.map((item) => [item.name, item.id]),
);

const districtsByProvinceId = districts.reduce<Record<number, string[]>>((acc, item) => {
  if (!acc[item.ilId]) acc[item.ilId] = [];
  acc[item.ilId].push(item.name);
  return acc;
}, {});

export function getTurkishDistrictsByProvinceName(provinceName: string): string[] {
  const provinceId = provinceIdByName.get(provinceName);
  if (!provinceId) return [];
  return districtsByProvinceId[provinceId] ?? [];
}
