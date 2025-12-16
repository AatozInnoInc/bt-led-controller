/**
 * Developer/Test User Configuration
 * Reads developer and test user IDs from environment variables
 * These users can bypass device ownership checks
 */

// Read from environment variables (set in .env.local)
// Format: DEVELOPER_USER_IDS=user1,user2,user3
// Format: TEST_USER_IDS=user4,user5

const getEnvVar = (key: string): string | undefined => {
  // In React Native, we need to use a different approach
  // For now, we'll use a hardcoded list that can be overridden
  // In production, this would come from environment variables or a config file
  return undefined; // Will be set via process.env in build time or runtime config
};

// Cache the lists (mutable for lazy loading)
let cachedDeveloperIds: string[] | null = null;
let cachedTestIds: string[] | null = null;

/**
 * Get developer user IDs from environment
 */
function getDeveloperUserIds(): string[] {
  try {
    // Try to read from environment variable
    // In Expo/React Native, this might need to be set via app.json or a config file
    const envValue = process.env.EXPO_PUBLIC_DEVELOPER_USER_IDS || getEnvVar('DEVELOPER_USER_IDS');
    
    if (envValue && typeof envValue === 'string') {
      return envValue
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);
    }
  } catch (error) {
    console.error('Failed to read developer user IDs:', error);
  }
  
  // Fallback: return empty array
  // Developers can add their IDs here temporarily for testing
  // IMPORTANT: This should be moved to .env.local in production
  return [
    // Add developer user IDs here if needed for testing
    // Example: '000705.a1f264ac9b024361b8d829d3724dea86.2039',
  ];
}

/**
 * Get test user IDs from environment
 */
function getTestUserIds(): string[] {
  try {
    const envValue = process.env.EXPO_PUBLIC_TEST_USER_IDS || getEnvVar('TEST_USER_IDS');
    
    if (envValue && typeof envValue === 'string') {
      return envValue
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);
    }
  } catch (error) {
    console.error('Failed to read test user IDs:', error);
  }
  
  // Fallback: return empty array
  return [];
}

/**
 * Check if a user ID is a developer user
 */
export function isDeveloperUser(userId: string): boolean {
  if (!userId) return false;
  
  if (cachedDeveloperIds === null) {
    cachedDeveloperIds = getDeveloperUserIds();
  }
  
  return cachedDeveloperIds.includes(userId);
}

/**
 * Check if a user ID is a test user
 */
export function isTestUser(userId: string): boolean {
  if (!userId) return false;
  
  if (cachedTestIds === null) {
    cachedTestIds = getTestUserIds();
  }
  
  return cachedTestIds.includes(userId);
}

/**
 * Check if a user ID is a developer or test user
 */
export function isDeveloperOrTestUser(userId: string): boolean {
  return isDeveloperUser(userId) || isTestUser(userId);
}

/**
 * Reload configuration (useful for testing or runtime updates)
 */
export function reloadConfig(): void {
  cachedDeveloperIds = null;
  cachedTestIds = null;
}

