/**
 * BedrockTheme.ts
 * 
 * This file defines the core theme and styling configuration for the Bedrock UI system.
 * It includes:
 * - Color palette definitions for the main UI colors and agent-specific colors
 * - Node styling configurations for different types of agents in the system
 * - Theme object with settings for:
 *   - Colors
 *   - Node styles
 *   - Spacing scales
 *   - Typography settings
 *   - Shadow definitions
 *   - Border radius values
 *
 * The theme can be imported and used throughout the application to maintain
 * consistent styling and branding.
 */

export const BedrockColors = {
  primary: '#0070f3',
  secondary: '#6c757d',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#f5222d',
  info: '#1890ff',
  light: '#f8f9fa',
  dark: '#343a40',
  background: '#ffffff',
  backgroundLight: '#f0f2f5',
  text: '#212529',
  textLight: '#6c757d',
  border: '#dee2e6',
  
  // Specific agent colors
  supervisor: '#4285F4', // Google Blue
  market: '#34A853',    // Google Green
  risk: '#EA4335',      // Google Red
  sentiment: '#FBBC05', // Google Yellow
  crypto: '#8B44CE',    // Purple
  portfolio: '#00796B', // Teal
  macro: '#0097A7',     // Cyan
  financial: '#F57C00', // Orange
  options: '#C2185B',   // Pink
  institutional: '#7B1FA2', // Deep Purple
  etf: '#00838F',       // Dark Cyan
};

// Node styling for different types of agents
export const NodeStyles = {
  supervisor: {
    bgColor: '#E8F2FE',
    borderColor: BedrockColors.supervisor,
    textColor: '#174EA6',
  },
  market: {
    bgColor: '#E6F4EA',
    borderColor: BedrockColors.market,
    textColor: '#0D652D',
  },
  risk: {
    bgColor: '#FCE8E6',
    borderColor: BedrockColors.risk,
    textColor: '#B31412',
  },
  sentiment: {
    bgColor: '#FEF7E0',
    borderColor: BedrockColors.sentiment,
    textColor: '#B06000',
  },
  user: {
    bgColor: '#F1F3F4',
    borderColor: '#5F6368',
    textColor: '#202124',
  },
  response: {
    bgColor: '#F8F9FA',
    borderColor: '#80868A',
    textColor: '#3C4043',
  },
};

// Default theme object
export const BedrockTheme = {
  colors: BedrockColors,
  nodeStyles: NodeStyles,
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    fontFamily: '"Amazon Ember", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.1)',
    large: '0 8px 16px rgba(0, 0, 0, 0.1)',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    round: '50%',
  },
};

export default BedrockTheme;