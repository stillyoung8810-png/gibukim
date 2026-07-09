import {
  createFailureResponse,
  createOptionsResponse,
  isOptionsRequest,
  isPostRequest,
} from '../_shared/http.ts';
import { handleAttendanceMonth, handleCreditAttendanceGold } from './handlers/attendance.ts';
import { handleBootstrap } from './handlers/bootstrap.ts';
import { handleCreditBoxOpenGold, handleCreditBoxes } from './handlers/boxes.ts';
import {
  handleCancelConversion,
  handleCreateConversion,
  handleFinalizeConversion,
  handleMarkConversionManualReview,
  handleMarkConversionSdkCallStarted,
} from './handlers/conversion.ts';
import {
  handleDonate,
  handleGetCampaignDetail,
  handleGetMyDonations,
  handleListCampaigns,
} from './handlers/donation.ts';

Deno.serve(async (request) => {
  if (isOptionsRequest(request)) {
    return createOptionsResponse();
  }

  if (!isPostRequest(request)) {
    return createFailureResponse('invalidRequest', 405);
  }

  const routeName = getRenewalRouteName(request);

  switch (routeName) {
    case 'bootstrap':
      return handleBootstrap(request);
    case 'credit-boxes':
      return handleCreditBoxes(request);
    case 'credit-box-open-gold':
      return handleCreditBoxOpenGold(request);
    case 'attendance-month':
      return handleAttendanceMonth(request);
    case 'credit-attendance-gold':
    case 'submit-attendance':
      return handleCreditAttendanceGold(request);
    case 'create-conversion':
      return handleCreateConversion(request);
    case 'mark-conversion-sdk-call-started':
      return handleMarkConversionSdkCallStarted(request);
    case 'finalize-conversion':
      return handleFinalizeConversion(request);
    case 'cancel-conversion':
      return handleCancelConversion(request);
    case 'mark-conversion-manual-review':
      return handleMarkConversionManualReview(request);
    case 'donate':
      return handleDonate(request);
    case 'list-campaigns':
      return handleListCampaigns(request);
    case 'get-campaign-detail':
      return handleGetCampaignDetail(request);
    case 'get-my-donations':
      return handleGetMyDonations(request);
    default:
      return createFailureResponse('invalidRequest', 404);
  }
});

function getRenewalRouteName(request: Request): string | null {
  const pathname = new URL(request.url).pathname;
  const marker = '/renewal/';
  const markerIndex = pathname.indexOf(marker);

  if (markerIndex < 0) {
    if (pathname.endsWith('/renewal') || pathname.endsWith('/renewal/')) {
      return null;
    }
    return null;
  }

  const route = pathname.slice(markerIndex + marker.length).replace(/\/+$/, '');
  return route.length > 0 ? route : null;
}
