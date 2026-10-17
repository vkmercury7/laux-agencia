import { queryOptions } from '@tanstack/react-query';
import { getSalesData } from './sales.functions';
export const salesQuery = queryOptions({queryKey:['commercial'],queryFn:()=>getSalesData()});
export type SalesData = Awaited<ReturnType<typeof getSalesData>>;