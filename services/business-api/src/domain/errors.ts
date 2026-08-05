export class MatchServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
