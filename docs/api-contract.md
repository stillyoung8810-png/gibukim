# gibukim renewal API 계약 (4단계)

> Base URL: `{SUPABASE_URL}/functions/v1/renewal/{route}`  
> Method: **POST** (OPTIONS 허용)  
> Auth: JWT 미검증 (`verify_jwt = false`). body의 `anonymousHash`로 식별.

공통 실패 응답:

```json
{ "type": "failure", "reason": "invalidRequest" | "userBlocked" | "emptyGold" | "serverError" | ... }
```

HTTP status는 대부분 200. 라우트 없음 404, 메서드 오류 405.

---

## 엔드포인트

| Route | 요청 | 성공 응답 요약 |
|-------|------|----------------|
| `bootstrap` | `anonymousHash`, `idempotencyKey`, `clientSentAtMs`, `initialAvailableBoxCount?` | 잔액·상자·오늘 전환/기부·활성 전환·**activeCampaign**·`todayKst` |
| `credit-boxes` | base + `earnedBoxCount` | `availableBoxCount`, `isReplay` (`time_box_credit`) |
| `credit-box-open-gold` | base | `creditedGold`, `goldBalance`, `availableBoxCount` |
| `attendance-month` | `anonymousHash`, `year`, `month` | `attendedDatesKst`, `todayKst` |
| `credit-attendance-gold` | base | (`submit-attendance` alias 동일) |
| `create-conversion` | base | `conversionId`, `goldToDebit`, `pointAmount` |
| `mark-conversion-sdk-call-started` | base + `conversionId` | 동일 shape |
| `finalize-conversion` | base + `conversionId` + `tossSuccessKey` | `goldBalance`, `todayConvertedTossPoint` |
| `cancel-conversion` | base + `conversionId` + `reason` | `{ type: "success" }` |
| `mark-conversion-manual-review` | base + `conversionId` + `reason` | `{ type: "success" }` |
| `donate` | base + `nickname` (1~10자) | `goldBalance: 0`, `creditedAmount`, `todayDonatedGold`, `activeCampaign` |
| `list-campaigns` | `anonymousHash` | `campaigns[]` (`id`, `title`, `coverImageUrl`) — `is_listed=true` |
| `get-campaign-detail` | `anonymousHash`, `campaignId` | 제목·금액·이미지·닉네임 목록 |
| `get-my-donations` | `anonymousHash` | `participatedCount`, `totalDonatedGold` |

### `bootstrap` 성공 예시 필드

```ts
{
  type: 'success',
  availableBoxCount: number,
  goldBalance: number,
  todayConvertedTossPoint: number,
  todayDonatedGold: number,
  activeConversion: { conversionId, status, pointAmount, expiresAtMs, statusUpdatedAtMs } | null,
  activeCampaign: { id, title, goalGold, currentGold, status } | null,
  serverNowMs: number,
  todayKst: string, // YYYY-MM-DD
}
```

### `donate` 실패 reason

| reason | UI |
|--------|-----|
| `emptyGold` | 보유 골드 부족 |
| `invalidRequest` | 닉네임 등 유효성 |
| `userBlocked` | 차단 |
| `serverError` | 서버 오류 |

---

## 제외 (kilomoa 대비)

- cheer feed 전체
- `credit-distance-boxes` → `credit-boxes` (`time_box_credit`)
- ops / analytics / cron

---

## 배포

```bash
npx supabase db push
npx supabase functions deploy renewal --project-ref usoaclcqxaxiusfiedfh
```

*최종 업데이트: 2026-07-09*
