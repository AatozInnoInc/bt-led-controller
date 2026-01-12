import { RGBColor } from "../types/config";

/**
 * Convert hex color to RGB color
 * @param hex - Hex color string
 * @returns RGB color
 */
export const hexToRgb = (hex: string): RGBColor => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return [r, g, b];
 };