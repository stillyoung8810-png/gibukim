// gibukim 전용 보상형 광고 슬롯 — 배포 전 Apps in Toss 콘솔 ID로 교체
export const GIBUKIM_BOX_OPEN_OPPORTUNITY_REWARD_AD_GROUP_ID = 'ait.v2.live.placeholder-box-open';
export const GIBUKIM_BOX_OPEN_OPPORTUNITY_SECONDARY_REWARD_AD_GROUP_ID =
  'ait.v2.live.placeholder-box-open-secondary';
export const GIBUKIM_BOX_OPEN_OPPORTUNITY_REWARD_AD_GROUP_IDS = [
  GIBUKIM_BOX_OPEN_OPPORTUNITY_REWARD_AD_GROUP_ID,
  GIBUKIM_BOX_OPEN_OPPORTUNITY_SECONDARY_REWARD_AD_GROUP_ID,
] as const;

export const GIBUKIM_BOOST_REWARD_AD_GROUP_ID = 'ait.v2.live.placeholder-boost';

export const gibukimRewardAdConfig = {
  boxOpenOpportunityAdGroupIds: GIBUKIM_BOX_OPEN_OPPORTUNITY_REWARD_AD_GROUP_IDS,
  boostAdGroupId: GIBUKIM_BOOST_REWARD_AD_GROUP_ID,
} as const;
