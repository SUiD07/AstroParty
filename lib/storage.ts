// import { RaceData, INITIAL_DATA } from '../types';
import { RaceData, INITIAL_DATA } from "@/app/types";

const STORAGE_KEY = 'astro_party_data';

export const storage = {
  save: (data: RaceData) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  load: (): RaceData => {
    if (typeof window === 'undefined') return INITIAL_DATA;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  }
};
