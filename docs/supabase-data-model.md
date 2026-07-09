# gibukim Supabase 데이터 · 연결 스펙

> 하루기부(gibukim)의 서버 원장, 기부 캠페인, 사용자 해시 연결을 정의합니다.  
> UI 화면 규칙은 [`ui-layout.md`](./ui-layout.md)를 따릅니다.  
> 레퍼런스: kilomoa(서버 원장·전환·출석), sansokim(시간 상자 적립·부스트)

---

## 목차

1. [아키텍처 원칙](#아키텍처-원칙)
2. [사용자 고유 해시](#사용자-고유-해시)
3. [골드 · 상자 · 출석 · 전환 (kilomoa 이식)](#골드--상자--출석--전환-kilomoa-이식)
4. [로컬 전용 상태 (Supabase 불필요)](#로컬-전용-상태-supabase-불필요)
5. [기부 캠페인 · 참여자 · 이미지](#기부-캠페인--참여자--이미지)
6. [기부 캠페인 운영 플로우](#기부-캠페인-운영-플로우)
7. [donate 트랜잭션](#donate-트랜잭션)
8. [상자 시간 적립 (sansokim식 하이브리드)](#상자-시간-적립-sansokim식-하이브리드)
9. [화면 ↔ 데이터 매핑](#화면--데이터-매핑)
10. [Edge Function 엔드포인트](#edge-function-엔드포인트)
11. [확정 사항 총정리](#확정-사항-총정리)
12. [레퍼런스](#레퍼런스)

---

## 아키텍처 원칙

| 원칙 | 내용 |
|------|------|
| 접근 | 앱은 Supabase DB에 **직접 접근하지 않음**. **Edge Function만** 호출 |
| 권한 | Edge Function이 **service role**로 DB 갱신. 테이블은 RLS + anon/authenticated revoke |
| 진실 공급원 | ledger가 감사 기준. `gold_balance` / `available_box_count` / `current_gold`는 현재 상태 캐시 |
| 멱등성 | 금전성 요청은 `(anonymous_hash, idempotency_key)` unique로 성공 replay |
| 금액 결정 | 클라이언트가 기부·전환 금액을 임의로 보내지 않음. **서버가 확정** |
| 하이브리드 | **적립 후보 계산은 클라이언트**, **최종 상자 수·골드는 서버** |

```text
getAnonymousKey().hash
        │
        ▼
 renewal_users ◄── gold_ledger / box_ledger / conversions / attendance_records
        │
        └── donation_participants.anonymous_hash
                    │
                    ▼
            donation_campaigns (+ donation_campaign_images / Storage)
```

---

## 사용자 고유 해시

- 로그인 없음.
- `getAnonymousKey()` 반환 `{ type: 'HASH', hash }`의 **hash**를 `anonymous_hash`로 사용.
- 토스 S2S 지급용 user key가 **아님**. 앱 내부 식별 전용.
- 앱 진입 시 `bootstrap`으로 `get_or_create_renewal_user(anonymous_hash)` 호출.

해시가 붙는 모든 서버 데이터:

| 영역 | 연결 |
|------|------|
| 유저 잔액·상태 | `renewal_users.anonymous_hash` (PK) |
| 골드·상자 원장 | `gold_ledger` / `box_ledger` |
| 출석·전환 | `attendance_records` / `conversions` |
| 기부 참여 | `donation_participants.anonymous_hash` |
| 내 기부 요약 · 오늘 기부 골드 | hash 기준 집계 |

UI 참여자 표시는 **닉네임만** (해시 비노출). [`ui-layout.md`](./ui-layout.md) 확정 #14.

---

## 골드 · 상자 · 출석 · 전환 (kilomoa 이식)

kilomoa `renewal` 원장을 기반으로 가져오고, gibukim 전용 타입·엔드포인트만 추가합니다.

### `renewal_users`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `anonymous_hash` | text PK | 사용자 식별 |
| `status` | text | `active` \| `blocked` \| `suspended` |
| `available_box_count` | integer ≥ 0 | 보유 상자 |
| `gold_balance` | integer ≥ 0 | 보유 골드 |
| `total_converted_toss_point` | integer ≥ 0 | 누적 토스 전환 |
| `created_at` / `updated_at` | timestamptz | |

- `blocked`: 적립·전환·기부 모두 차단 (기부 정책은 구현 시 blocked면 donate 거부).
- `suspended`: 토스 포인트 지급만 차단. 골드 적립·기부는 허용(kilomoa와 동일 취지).

### `gold_ledger`

| type | 부호 | 용도 |
|------|------|------|
| `box_open_credit` | + | 상자 열기 골드 |
| `attendance_credit` | + | 출석 골드 |
| `conversion_hold_debit` | − | 토스 전환 예약 hold |
| `conversion_hold_release` | + | hold 해제 |
| `donation_debit` | − | **기부 전액 차감 (gibukim 추가)** |
| `admin_adjustment` | ± | 운영 조정 |

`(anonymous_hash, idempotency_key)` unique.

### `box_ledger`

| type | 부호 | 용도 |
|------|------|------|
| `time_box_credit` | + | **시간 적립 상자 발급 (gibukim, sansokim식)** |
| `box_open_debit` | − | 상자 열기 소비 |
| `admin_adjustment` | ± | 운영 조정 |

> kilomoa의 `distance_box_credit`(거리)는 gibukim에서 사용하지 않습니다. 시간 적립만 사용합니다.

### `conversions` / `attendance_records`

kilomoa와 동일:

- 전환: pending → sdk_call_started → finalized / cancelled / expired / manual_review
- 출석: KST 일 1회, `(anonymous_hash, attendance_date_kst)` unique

### 기부 금액 정책

- 클라이언트는 기부 금액을 **보내지 않음**.
- 서버가 `gold_balance`를 읽어 **전액(N)** 기부.
- 성공 시 사용자 `gold_balance = 0`.
- 토스트 `{N}` = 서버가 확정한 전액.

---

## 로컬 전용 상태 (Supabase 불필요)

| 항목 | 저장 | 비고 |
|------|------|------|
| 상자 열기 기회 | `Storage` | 리워드 광고 완료 후 1회. 서버 적립 idempotencyKey로 사용 |
| 부스트 | `Storage` | sansokim식 `boostEndsAtMs` 등. 시간 적립 배속 |
| 시간 적립 remainder / `lastAccruedAtMs` | `Storage` | 후보 상자 계산용 |
| 전환 `tossSuccessKey` | `Storage` | finalize 복구용 |

서버 잔액과 혼동하지 않습니다. 표시용 상자 수는 서버 `available_box_count`와 동기화합니다.

---

## 기부 캠페인 · 참여자 · 이미지

### `donation_campaigns`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | uuid PK | |
| `title` | text | 기부처 제목. 플레이스홀더는 `'다음 기부'` |
| `goal_gold` | integer | 목표 골드 |
| `current_gold` | integer | 모인 골드 |
| `status` | text | `active` \| `scheduled` \| `completed` \| `placeholder_active` |
| `is_active` | boolean | 홈·donate 대상. **true는 전역 1건** (partial unique index) |
| `is_listed` | boolean | 기부 목록·상세 노출. 플레이스홀더는 **`false`** |
| `sort_order` | integer | scheduled 승격 순서 (낮을수록 우선). 없으면 `created_at` |
| `created_at` / `updated_at` | timestamptz | |

### `donation_campaign_images` (다중 + 커버=썸네일)

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `url` | text | Storage public URL |
| `sort_order` | integer | 상세 갤러리 순서 |
| `is_cover` | boolean | **목록 썸네일**. 캠페인당 cover 1장 |

대안(단순화): `donation_campaigns.image_urls text[]` + `cover_index int` (기본 0).  
어느 쪽이든 **목록 썸네일 = 커버**, **상세 = 전체**, **홈 기부 카드 = 이미지 없음**.

### `donation_participants`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `anonymous_hash` | text | **필수**. 내 기부·오늘 기부 집계 |
| `nickname` | text | max 10자(띄어쓰기 포함), 중복 허용 |
| `gold_amount` | integer | **이 캠페인에 실제로 들어간** 분량 |
| `donated_at` | timestamptz | KST “오늘 기부” 집계 기준 |
| `idempotency_key` | text | 요청 단위 또는 `donate:{key}:{campaign_id}` 파생 |

한 번의 donate가 캠페인 경계를 넘으면 **캠페인별 participants row를 여러 줄** 삽입합니다.

### Storage

1. 버킷에 이미지 업로드 → public URL을 `donation_campaign_images.url`에 저장.
2. 제목·목표·scheduled 캠페인은 Table Editor로 사전 등록 가능.
3. `current_gold` / `is_active` 전환의 **본선은 donate 트랜잭션** (수동 수정도 가능하나 레이스 주의).

---

## 기부 캠페인 운영 플로우

확정: **목표 도달 시 자동 종료 + scheduled 자동 승격**. scheduled가 없으면 플레이스홀더 생성.

```text
donate로 current_gold가 goal에 도달/초과
  → 현재 캠페인: is_active=false, status=completed
  → scheduled 중 가장 앞 1건: is_active=true, status=active
  → scheduled 없음:
       INSERT
         title = '다음 기부'
         goal_gold = 직전 캠페인 goal_gold
         current_gold = (루프에서 배분된 초과분)
         is_active = true
         is_listed = false
         status = placeholder_active
```

| 상태 | 홈 카드 | 기부하기 | 목록·상세 |
|------|---------|----------|-----------|
| `active` (실캠페인) | ✅ | ✅ | ✅ (`is_listed=true`) |
| `placeholder_active` | ✅ (제목「다음 기부」) | ✅ | ❌ (`is_listed=false`) |
| `scheduled` | ❌ | ❌ | ❌ (또는 운영만) |
| `completed` | ❌ | ❌ | ✅ (`is_listed=true`) |

운영자는 다음 실캠페인을 `scheduled` + 이미지·제목·목표로 미리 올려 둡니다. 없으면 서비스가 `'다음 기부'`로 끊기지 않고 이어집니다.

---

## donate 트랜잭션

전액 기부 + 해시 + 목표 도달 시 교체 + **초과분은 다음 캠페인(들)에 연속 적립** (사용자에게 환불하지 않음).

환불보다 다음 캠페인 적립 루프가 UX·원장·코딩 모두 단순합니다. 성공 시 사용자 골드는 항상 0입니다.

```text
1. renewal_users FOR UPDATE (anonymous_hash)
2. N = gold_balance
   N <= 0 → failure emptyGold
3. gold_ledger donation_debit -N
   gold_balance = 0
4. remaining = N
5. loop:
     active = is_active 캠페인 FOR UPDATE
     (없으면 → 플레이스홀더 생성 후 재시도)
     space = goal_gold - current_gold
     take  = min(remaining, space)
     current_gold += take
     INSERT donation_participants
       (campaign_id, anonymous_hash, nickname, gold_amount=take,
        idempotency_key 파생)
     remaining -= take
     if current_gold >= goal_gold:
       is_active = false, status = completed
       if exists scheduled (order by sort_order, created_at):
         promote → is_active=true, status=active
       else:
         create placeholder
           title='다음 기부'
           goal_gold = 직전 goal_gold
           is_listed=false
           is_active=true
           status=placeholder_active
     if remaining == 0: break
     // remaining > 0 이면 새 active에 이어서 적립
6. return {
     goldBalance: 0,
     creditedAmount: N,        // 토스트 {N}
     todayDonatedGold,
     activeCampaign,           // 교체 후 현재 활성
   }
```

### 멱등성

- 요청 `idempotency_key` 1개로 전체 donate 성공 시 replay.
- 캠페인별 participant 키 예: `donate:{idempotencyKey}:{campaignId}`.

### 실패 매핑 (UI 토스트)

| 서버 reason | 토스트 (ui-layout) |
|-------------|-------------------|
| emptyGold / 골드 부족 | 보유 골드가 부족해요… |
| network | 네트워크 연결을 확인하고… |
| serverError | 잠시 후 다시 시도해 주세요. |
| nickname 유효성 | 닉네임은 10자 이내로… |
| 기타 | 기부에 실패했어요… |

---

## 상자 시간 적립 (sansokim식 하이브리드)

```text
[클라이언트] lastAccruedAtMs · 부스트 · remainder로 earnedBoxCount 후보 계산
       → Edge: credit-boxes (time_box_credit, idempotent)
       → renewal_users.available_box_count / box_ledger

[클라이언트] 리워드 광고 → 로컬 상자 열기 기회 1회
       → 4탭 완료
       → Edge: credit-box-open-gold
       → box_open_debit -1 + box_open_credit +1 (동일 트랜잭션)
```

- 거리 GPS / kilomoa `credit-distance-boxes` 경로는 **사용하지 않음**.
- 부스트·기회는 로컬. 최종 상자 수·골드는 서버.

---

## 화면 ↔ 데이터 매핑

| 화면 | 읽기 | 쓰기 |
|------|------|------|
| Home 기부 목표 | `is_active` 캠페인 `title`, `goal_gold`, `current_gold` (이미지 없음) | — |
| Home 히어로·상자 | bootstrap `availableBoxCount` + 로컬 부스트/기회/시간 진행 | credit-boxes, credit-box-open-gold |
| Point 보유 골드 | `gold_balance` | conversion, donate |
| Point 오늘 기부 | 당일 KST + hash `donation_participants` 합 | donate |
| Point 토스 받기 | `conversions` (kilomoa와 동일) | create → SDK → finalize |
| Point 출석 | `attendance_records` | credit-attendance |
| Donation 목록 | `is_listed=true` 캠페인 + **커버 이미지** + `title` | — |
| Donation 상세 | 다중 이미지, `title`, `current_gold`, 닉네임 목록 | — |
| 내 기부 요약 | hash 기준 참여 캠페인 수 · 총 골드 | — |

플레이스홀더(`is_listed=false`)는 목록·상세에 **노출하지 않음**. 홈·기부하기에는 노출.

---

## Edge Function 엔드포인트

### kilomoa에서 가져올 것

| 엔드포인트 | 역할 |
|------------|------|
| `POST /bootstrap` | 유저 생성·잔액·상자·활성 전환·(권장) 오늘 기부·활성 캠페인 |
| `POST /credit-boxes` | 시간 적립 상자 확정 (`time_box_credit`) |
| `POST /credit-box-open-gold` | 상자 열기 → 골드 |
| `POST /credit-attendance-gold` | 출석 |
| attendance month 조회 | 달력 |
| conversion 계열 | create / sdk-started / finalize / cancel / recover |

### gibukim 신규

| 엔드포인트 | 역할 |
|------------|------|
| `POST /donate` | 전액 기부 + 캠페인 배분·교체 루프 |
| `GET` 또는 bootstrap 내 active campaign | 홈 기부 카드 |
| `list-campaigns` | `is_listed=true` 목록 (커버+제목) |
| `get-campaign-detail` | 상세 + 이미지 + 닉네임 |
| `get-my-donations` | 내 요약 (hash) |

### gibukim에서 제외

- kilomoa 응원 피드(`cheer_*`) — UI 스펙상 삭제.

---

## 확정 사항 총정리

| # | 항목 | 확정 |
|---|------|------|
| 1 | 서버 원장 | kilomoa식. Edge Function only |
| 2 | 사용자 식별 | `getAnonymousKey()` hash → `anonymous_hash` |
| 3 | 상자 적립 | sansokim **시간** 적립. 클라 후보 → 서버 확정 |
| 4 | 기부 금액 | 서버 **전액 기부**. 클라 금액 입력 없음 |
| 5 | 목표 도달 | **자동 종료** + **scheduled 자동 승격** |
| 6 | scheduled 없음 | `title='다음 기부'`, `goal_gold=직전`, `is_active=true`, `is_listed=false` |
| 7 | 초과 골드 | **다음 캠페인(들)에 연속 적립**. 환불 없음 |
| 8 | 이미지 | **다중**. **커버 = 목록 썸네일**. 홈 카드 이미지 없음 |
| 9 | 플레이스홀더 | 목록·상세 **비노출** |
| 10 | 참여자 UI | 닉네임만 (해시 아님) |
| 11 | participants | `anonymous_hash` + `idempotency_key` 필수 |
| 12 | gold_ledger | `donation_debit` 추가 |
| 13 | box_ledger | `time_box_credit` (거리 적립 미사용) |

---

## 레퍼런스

| 영역 | 프로젝트 | 참고 |
|------|----------|------|
| 서버 원장·전환·출석 | kilomoa | `docs/renewal-plan/`, `supabase/migrations/`, `supabase/functions/renewal/` |
| 사용자 해시 | kilomoa / sansokim | `src/rewardIdentity.ts`, `getAnonymousKey` |
| 시간 상자·부스트 | sansokim | `src/domain/sansokimRewardPolicy.ts`, `sansokimPolicy.ts` |
| 상자 열기 기회 | kilomoa / sansokim | `src/storage/boxOpenOpportunityStorage.ts` |
| UI 화면 | gibukim | [`ui-layout.md`](./ui-layout.md) |

---

*최종 업데이트: 2026-07-09 (대화 확정분 반영)*
