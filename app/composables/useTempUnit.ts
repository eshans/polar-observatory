/** °C / °F preference, shared across the page. */
export const useTempUnit = () => useState<TempUnit>('temp-unit', () => 'C')
