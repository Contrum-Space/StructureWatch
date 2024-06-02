export function padNumber(num: number, length: number): string {
    return num.toString().padStart(length, '0');
  }
  
export function toProperCase(camelCase: string): string {
  return camelCase.replace(/([A-Z]+)([A-Z][a-z]+)/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\sFinished$/g, " Finished");
}