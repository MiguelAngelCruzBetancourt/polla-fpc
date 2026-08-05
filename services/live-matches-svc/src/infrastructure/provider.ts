import type { SportsDataProvider } from "../domain/sports-provider";
import { ApiFootballProvider } from "./api-football-provider";

let instance: SportsDataProvider | null = null;

export function getProvider(): SportsDataProvider {
  if (!instance) {
    const baseUrl = process.env.API_FOOTBALL_BASE_URL;
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error("Faltan API_FOOTBALL_BASE_URL / API_FOOTBALL_KEY");
    }
    instance = new ApiFootballProvider(baseUrl, apiKey);
  }
  return instance;
}
