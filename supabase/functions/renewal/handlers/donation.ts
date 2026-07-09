import {
  createFailureResponse,
  createJsonResponse,
  readJsonBody,
} from '../../_shared/http.ts';
import { createSupabaseAdminClient } from '../../_shared/supabaseAdmin.ts';
import {
  parseAnonymousHashRequest,
  parseCampaignDetailRequest,
  parseDonateRequest,
} from '../../_shared/request.ts';
import { isFailureResponse, isRecord } from '../../_shared/db.ts';
import type {
  ActiveCampaignSnapshot,
  CampaignDetailResponse,
  CampaignListItem,
  DonateResponse,
  ListCampaignsResponse,
  MyDonationsResponse,
} from '../../_shared/renewalTypes.ts';

export async function handleDonate(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const donateRequest = parseDonateRequest(requestBody);

  if (donateRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('donate_renewal_gold', {
      p_anonymous_hash: donateRequest.anonymousHash,
      p_idempotency_key: donateRequest.idempotencyKey,
      p_nickname: donateRequest.nickname,
    });

    if (error != null) {
      throw error;
    }

    if (!isDonateResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal donate failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleListCampaigns(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const hashRequest = parseAnonymousHashRequest(requestBody);

  if (hashRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('donation_campaigns')
      .select('id, title, donation_campaign_images(url, is_cover)')
      .eq('is_listed', true)
      .order('created_at', { ascending: false });

    if (error != null) {
      throw error;
    }

    const campaigns: CampaignListItem[] = Array.isArray(data)
      ? data.flatMap((row) => {
          if (!isRecord(row) || typeof row.id !== 'string' || typeof row.title !== 'string') {
            return [];
          }

          const images = Array.isArray(row.donation_campaign_images)
            ? row.donation_campaign_images
            : [];
          const cover = images.find((image) => isRecord(image) && image.is_cover === true);
          const coverImageUrl =
            cover != null && isRecord(cover) && typeof cover.url === 'string' ? cover.url : null;

          return [
            {
              id: row.id,
              title: row.title,
              coverImageUrl,
            },
          ];
        })
      : [];

    const response: ListCampaignsResponse = {
      type: 'success',
      campaigns,
    };

    return createJsonResponse(response);
  } catch (error) {
    console.error('renewal list campaigns failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleGetCampaignDetail(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const detailRequest = parseCampaignDetailRequest(requestBody);

  if (detailRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: campaign, error: campaignError } = await supabase
      .from('donation_campaigns')
      .select('id, title, goal_gold, current_gold, is_listed')
      .eq('id', detailRequest.campaignId)
      .maybeSingle();

    if (campaignError != null) {
      throw campaignError;
    }

    if (!isRecord(campaign) || campaign.is_listed !== true) {
      return createFailureResponse('invalidRequest');
    }

    const [{ data: images, error: imagesError }, { data: participants, error: participantsError }] =
      await Promise.all([
        supabase
          .from('donation_campaign_images')
          .select('url, is_cover, sort_order')
          .eq('campaign_id', detailRequest.campaignId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('donation_participants')
          .select('nickname')
          .eq('campaign_id', detailRequest.campaignId)
          .order('donated_at', { ascending: false }),
      ]);

    if (imagesError != null) {
      throw imagesError;
    }

    if (participantsError != null) {
      throw participantsError;
    }

    const response: CampaignDetailResponse = {
      type: 'success',
      id: String(campaign.id),
      title: String(campaign.title),
      goalGold: Number(campaign.goal_gold),
      currentGold: Number(campaign.current_gold),
      images: Array.isArray(images)
        ? images.flatMap((image) => {
            if (!isRecord(image) || typeof image.url !== 'string') {
              return [];
            }
            return [{ url: image.url, isCover: image.is_cover === true }];
          })
        : [],
      participantNicknames: Array.isArray(participants)
        ? participants.flatMap((row) => {
            if (!isRecord(row) || typeof row.nickname !== 'string') {
              return [];
            }
            return [row.nickname];
          })
        : [],
    };

    return createJsonResponse(response);
  } catch (error) {
    console.error('renewal get campaign detail failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleGetMyDonations(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const hashRequest = parseAnonymousHashRequest(requestBody);

  if (hashRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('donation_participants')
      .select('campaign_id, gold_amount')
      .eq('anonymous_hash', hashRequest.anonymousHash);

    if (error != null) {
      throw error;
    }

    const campaignIds = new Set<string>();
    let totalDonatedGold = 0;

    if (Array.isArray(data)) {
      for (const row of data) {
        if (!isRecord(row)) {
          continue;
        }
        if (typeof row.campaign_id === 'string') {
          campaignIds.add(row.campaign_id);
        }
        if (typeof row.gold_amount === 'number') {
          totalDonatedGold += row.gold_amount;
        }
      }
    }

    const response: MyDonationsResponse = {
      type: 'success',
      participatedCount: campaignIds.size,
      totalDonatedGold,
    };

    return createJsonResponse(response);
  } catch (error) {
    console.error('renewal get my donations failed', error);
    return createFailureResponse('serverError');
  }
}

function isDonateResponse(value: unknown): value is DonateResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return typeof value.reason === 'string';
  }

  return (
    value.type === 'success' &&
    typeof value.goldBalance === 'number' &&
    typeof value.creditedAmount === 'number' &&
    typeof value.todayDonatedGold === 'number' &&
    typeof value.isReplay === 'boolean' &&
    isActiveCampaignSnapshot(value.activeCampaign)
  );
}

function isActiveCampaignSnapshot(value: unknown): value is ActiveCampaignSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.goalGold === 'number' &&
    typeof value.currentGold === 'number' &&
    (value.status === 'active' || value.status === 'placeholder_active')
  );
}
