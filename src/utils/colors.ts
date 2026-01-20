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

/**
 * Convert RGB color to hex color string
 * @param rgb - RGB color array
 * @returns Hex color string
 */
export const rgbToHex = (rgb: RGBColor): string => {
	const r = Math.round(rgb[0]).toString(16).padStart(2, '0');
	const g = Math.round(rgb[1]).toString(16).padStart(2, '0');
	const b = Math.round(rgb[2]).toString(16).padStart(2, '0');
	return `#${r}${g}${b}`;
};