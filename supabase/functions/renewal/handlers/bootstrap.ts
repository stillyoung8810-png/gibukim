import {
  createFailureResponse,
  createJsonResponse,
  readJsonBody,
} from '../../_shared/http.ts';
import { getKstDateString } from '../../_shared/kst.ts';
import { createSupabaseAdminClient } from '../../_shared/supabaseAdmin.ts';
import { parseBootstrapRequest } from '../../_shared/request.ts';
import {
  getActiveCampaignSnapshot,
  getActiveConversionSnapshot,
  getOrCreateRenewalUser,
  getTodayConvertedTossPoint,
  getTodayDonatedGold,
} from '../../_shared/db.ts';
import type { BootstrapResponse } from '../../_shared/renewalTypes.ts';

export async function handleBootstrap(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const bootstrapRequest = parseBootstrapRequest(requestBody);

  if (bootstrapRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const user = await getOrCreateRenewalUser(
      supabase,
      bootstrapRequest.anonymousHash,
      bootstrapRequest.initialAvailableBoxCount,
    );

    if (user == null) {
      return createFailureResponse('serverError');
    }

    const serverNow = new Date();
    const todayKst = getKstDateString(serverNow);
    const [todayConvertedTossPoint, todayDonatedGold, activeConversion, activeCampaign] =
      await Promise.all([
        getTodayConvertedTossPoint({
          supabase,
          anonymousHash: bootstrapRequest.anonymousHash,
          todayKst,
        }),
        getTodayDonatedGold({
          supabase,
          anonymousHash: bootstrapRequest.anonymousHash,
          todayKst,
        }),
        getActiveConversionSnapshot(supabase, bootstrapRequest.anonymousHash),
        getActiveCampaignSnapshot(supabase),
      ]);

    const response: BootstrapResponse = {
      type: 'success',
      availableBoxCount: user.available_box_count,
      goldBalance: user.gold_balance,
      todayConvertedTossPoint,
      todayDonatedGold,
      activeConversion,
      activeCampaign,
      serverNowMs: serverNow.getTime(),
      todayKst,
    };

    return createJsonResponse(response);
  } catch (error) {
    console.error('renewal bootstrap failed', error);
    return createFailureResponse('serverError');
  }
}
