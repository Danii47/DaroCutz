export function capitalizeWords(str: string): string {
  return str
    .split(" ")                  // separa por espacios
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // capitaliza cada palabra
    .join(" ");                  // vuelve a unir
}