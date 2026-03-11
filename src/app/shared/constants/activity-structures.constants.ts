import { ACTIVITIES_BINDING_PATHS } from '../enums';

export interface ActivityPropertyOption {
  value: string;
  label: string;
}

/** Path for AMS Activities array (objects have the structure defined in AMS_ACTIVITY_PROPERTIES). */
export const AMS_ACTIVITIES_PATH = ACTIVITIES_BINDING_PATHS[0];

/** Path for Non-AMS Activities array (objects have the structure defined in NON_AMS_ACTIVITY_PROPERTIES). */
export const NON_AMS_ACTIVITIES_PATH = ACTIVITIES_BINDING_PATHS[1];

/**
 * Property options for each item in AMS Activities array.
 * When user chooses "AMS Activities", the child dropdown loads this structure.
 */
export const AMS_ACTIVITY_PROPERTIES: ActivityPropertyOption[] = [
  { value: 'entryDate', label: 'Entry Date' },
  { value: 'effectiveDate', label: 'Effective Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'additionalDescription', label: 'Additional Description' },
  { value: 'description', label: 'Description' },
  { value: 'activityTypeCode', label: 'Activity Type' },
  { value: 'categoryCode', label: 'Category' },
  { value: 'currencyCode', label: 'Currency' },
  { value: 'transactionId', label: 'Transaction ID' },
  { value: 'transactionDate', label: 'Transaction Date' },
];

/**
 * Property options for each item in Non-AMS Activities array.
 * When user chooses "Non-AMS Activities", the child dropdown loads this structure.
 * Adjust properties if Non-AMS activity objects have a different shape.
 */
export const NON_AMS_ACTIVITY_PROPERTIES: ActivityPropertyOption[] = [
  { value: 'entryDate', label: 'Entry Date' },
  { value: 'effectiveDate', label: 'Effective Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'additionalDescription', label: 'Additional Description' },
  { value: 'description', label: 'Description' },
  { value: 'activityTypeCode', label: 'Activity Type' },
  { value: 'categoryCode', label: 'Category' },
  { value: 'currencyCode', label: 'Currency' },
  { value: 'transactionId', label: 'Transaction ID' },
  { value: 'transactionDate', label: 'Transaction Date' },
];

const PATH_TO_PROPERTIES: Record<string, ActivityPropertyOption[]> = {
  [AMS_ACTIVITIES_PATH]: AMS_ACTIVITY_PROPERTIES,
  [NON_AMS_ACTIVITIES_PATH]: NON_AMS_ACTIVITY_PROPERTIES,
};

/** Returns the child dropdown options for the chosen activities path (object structure when that activity type is loaded). */
export function getActivityPropertiesForPath(path: string): ActivityPropertyOption[] {
  return PATH_TO_PROPERTIES[path] ?? AMS_ACTIVITY_PROPERTIES;
}
