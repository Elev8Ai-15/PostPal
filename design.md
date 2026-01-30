# PostPal Mobile App - Interface Design Document

## Overview

PostPal is an AI-powered marketing assistant mobile app designed for **mobile portrait orientation (9:16)** and **one-handed usage**. The design follows **Apple Human Interface Guidelines (HIG)** to ensure the app feels like a first-party iOS application.

---

## Screen List

| Screen | Purpose |
|--------|---------|
| **Dashboard** | Central hub showing key marketing metrics and quick actions |
| **Calendar** | Interactive content calendar for scheduling and viewing posts |
| **Approvals** | Queue of AI-generated content awaiting user review/approval |
| **Analytics** | Performance insights and data visualizations |
| **Strategy** | Overview of the user's AI-generated marketing strategy |
| **Settings** | Account preferences, notifications, and app configuration |

---

## Screen Details

### 1. Dashboard (Home Tab)

**Primary Content:**
- Welcome header with user greeting and date
- Three metric cards displayed horizontally (scrollable):
  - Follower Growth (percentage with trend indicator)
  - Audience Growth (percentage)
  - Cost Savings (dollar amount)
- Quick Actions section:
  - "Review Content" button (links to Approvals)
  - "View Calendar" button (links to Calendar)
- Recent Activity feed (last 3-5 items)

**Layout:**
- Full-width metric cards with rounded corners
- Cards use `surface` background with subtle shadow
- Primary accent color for key numbers
- Bottom padding for tab bar clearance

---

### 2. Content Calendar (Calendar Tab)

**Primary Content:**
- Month/Week toggle at top
- Calendar grid showing scheduled content
- Color-coded dots indicating content type:
  - Blue: Social media posts
  - Green: Blog articles
  - Purple: Newsletters
  - Orange: Video content
- Day detail view when tapping a date
- List of scheduled items for selected day

**Functionality:**
- Swipe left/right to change months
- Tap date to see scheduled content
- Tap content item to view details

---

### 3. Content Approval (Approvals Tab)

**Primary Content:**
- Header showing pending count badge
- Card-based list of pending content items
- Each card shows:
  - Content type icon
  - Preview text (truncated)
  - Scheduled date/time
  - Platform icons (Instagram, Twitter, etc.)
- Swipe actions:
  - Swipe right: Approve
  - Swipe left: Request revision
- Tap to expand full preview

**Functionality:**
- Pull-to-refresh for new content
- Batch approve option in header
- Filter by content type

---

### 4. Analytics & Insights (Analytics Tab)

**Primary Content:**
- Time period selector (7d, 30d, 90d)
- Key metrics summary row
- Performance chart (line graph showing growth)
- Top Performing Content section:
  - Ranked list of best posts
  - Engagement metrics per post
- Insights cards:
  - "Best posting time"
  - "Top hashtags"
  - "Audience demographics"

**Layout:**
- Chart takes ~40% of screen height
- Scrollable content below chart
- Cards with clear visual hierarchy

---

### 5. Strategy Overview (Strategy Tab)

**Primary Content:**
- Strategy summary card at top
- Goals section with progress indicators
- Content pillars (3-4 themed categories)
- Recommended actions list
- Timeline showing 12-month plan milestones

**Layout:**
- Vertical scrolling layout
- Progress bars for goal tracking
- Collapsible sections for detailed info

---

### 6. Settings

**Primary Content:**
- Profile section (avatar, name, email)
- Preferences:
  - Notification settings
  - Content preferences
  - Posting schedule defaults
- Connected accounts (social platforms)
- App settings:
  - Theme (light/dark/auto)
  - Language
- About & Help section
- Sign out button

**Layout:**
- Grouped list style (iOS Settings pattern)
- Chevron indicators for drill-down items
- Toggle switches for on/off settings

---

## Key User Flows

### Flow 1: Review and Approve Content
1. User opens app → Dashboard
2. Sees "5 items pending review" in Quick Actions
3. Taps "Review Content" → Approvals screen
4. Swipes through content cards
5. Swipe right to approve, left to request revision
6. Returns to Dashboard with updated count

### Flow 2: Check Today's Schedule
1. User opens app → Dashboard
2. Taps "View Calendar" → Calendar screen
3. Today's date is highlighted
4. Taps today → sees list of scheduled posts
5. Taps a post → sees full preview

### Flow 3: View Performance
1. User taps Analytics tab
2. Selects time period (30 days)
3. Views growth chart
4. Scrolls to see top performing content
5. Taps insight card for recommendations

---

## Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | #6366F1 (Indigo) | #818CF8 | Accent, buttons, highlights |
| `background` | #FFFFFF | #0F0F0F | Screen backgrounds |
| `surface` | #F8FAFC | #1A1A1A | Cards, elevated surfaces |
| `foreground` | #0F172A | #F8FAFC | Primary text |
| `muted` | #64748B | #94A3B8 | Secondary text |
| `border` | #E2E8F0 | #27272A | Dividers, borders |
| `success` | #22C55E | #4ADE80 | Positive metrics, approvals |
| `warning` | #F59E0B | #FBBF24 | Pending items |
| `error` | #EF4444 | #F87171 | Negative metrics, rejections |

---

## Typography

- **Headlines:** Bold, 24-32px
- **Titles:** Semibold, 18-20px
- **Body:** Regular, 16px
- **Caption:** Regular, 12-14px, muted color

---

## Tab Bar Configuration

| Tab | Icon | Label |
|-----|------|-------|
| Home | house.fill | Dashboard |
| Calendar | calendar | Calendar |
| Approvals | checkmark.circle.fill | Approvals |
| Analytics | chart.bar.fill | Analytics |
| Settings | gearshape.fill | Settings |

---

## Design Principles

1. **Clarity:** Information hierarchy is clear; most important data is prominent
2. **Efficiency:** Common actions are accessible within 1-2 taps
3. **Feedback:** Every action has visual/haptic feedback
4. **Consistency:** Patterns repeat across screens for familiarity
5. **Accessibility:** Touch targets minimum 44pt, sufficient contrast ratios
