import { isLocalServer, isMapboxDomain } from '.';
import { config } from '../config';

import { version } from '../../package.json';

const CONTRIBUTE_API_BASE_URL = 'https://contribute-api.mapbox.com/v1';
const CONTRIBUTE_API_STAGING_BASE_URL =
  'https://contribute-api-staging.tilestream.net/v1';
const EDIT_SUGGESTION_ENDPOINT = 'edit-suggestion';

/**
 * Object defining changes made to an address location feature.
 * Sent as part of payload to Contribute API.
 */
export interface ContributeChanges {
  house?: string; // House number
  street?: string; // Street name
  address?: string; // Full address from Address Autofill SDK
  location?: { longitude: number; latitude: number }; // Location of the user-adjusted pin
}

export interface FeedbackArgs {
  originalCoordinate: [number, number];
  originalAddress: string;
  changes: ContributeChanges;
  labels?: string[];
}

interface LocationDto {
  latitude: number;
  longitude: number;
}

interface UpdateAddressEditSuggestionDto {
  location: LocationDto;
  comment?: string;
  attachments?: string[];
  userEmail: string;
  userLocation?: LocationDto;
  notificationsDisabled?: boolean;
  submissionNotificationDisabled?: boolean;
  searchQuery?: string;
  selectedFeature?: string;
  selectedFeatureIndex?: number;
  referrer?: string;
  labels?: string[];
  version: '1.18'; // https://github.com/mapbox/itm-backend/blob/main/docs/edit-suggestion.entity_versions.md
  action: 'update';
  reason: 'incorrect_data';
  placeName?: string;
  mapboxId?: string;
  changes?: {
    address?: string;
    location?: LocationDto;
  };
}

/**
 * Sends feedback to the Mapbox Contribute API (https://github.com/mapbox/itm-backend) given an original Address Autofill API feature and a set of user-defined changes to the address or location.
 * @param accessToken - Mapbox access token
 * @param {FeedbackArgs} feedbackArgs - Data detailing the original address and location and any changes requested
 * @param {[number, number]} feedbackArgs.originalCoordinate - Original coordinate from the Address Autofill API
 * @param {string} feedbackArgs.originalAddress - Original full_address or place_name from the Address Autofill API
 * @param {ContributeChanges} feedbackArgs.changes - Address fields or location changed by a user
 * @param {string[]} [feedbackArgs.labels] - List of labels which will be associated with the feedback
 */
export function sendFeedback(
  accessToken: string,
  feedbackArgs: FeedbackArgs
): void {
  // Skip sending feedback if disabled in global config
  if (!config.feedbackEnabled) return;

  // Direct feedback sent during development or from Mapbox site to staging server
  const hostname = window.location.hostname;
  const BASE_URL =
    isLocalServer(hostname) || isMapboxDomain(hostname)
      ? CONTRIBUTE_API_STAGING_BASE_URL
      : CONTRIBUTE_API_BASE_URL;
  const url = `${BASE_URL}/${EDIT_SUGGESTION_ENDPOINT}/address?access_token=${accessToken}`;

  const { originalCoordinate, originalAddress, changes, labels } = feedbackArgs;

  const payload: UpdateAddressEditSuggestionDto = {
    version: '1.18',
    action: 'update',
    reason: 'incorrect_data',
    location: {
      // original location of the address (suggested by SDK/API)
      longitude: originalCoordinate[0],
      latitude: originalCoordinate[1]
    },
    userEmail: 'no-reply-autofill@mapbox.com',
    changes,
    placeName: originalAddress, // Full (original) address from Address Autofill SDK
    labels,
    notificationsDisabled: true,
    submissionNotificationDisabled: true
  };

  fetch(url, {
    method: 'POST',
    headers: new Headers({
      'User-Agent': `mapbox-search-js.${version}.${navigator.userAgent}`,
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(payload)
  });
}
