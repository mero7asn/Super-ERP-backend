# SUPER CRM & HRM DESIGN SYSTEM SPECIFICATION
## Figma UI/UX Technical Blueprint & Token Dictionary
**Document Reference:** DS-SPEC-V1.0.0  
**Status:** Approved for Implementation  
**Target Viewports:** Responsive Web (Desktop, Tablet, Mobile)  
**Associated Workspace:** [Super CRM (Local)](file:///c:/Users/Admin/Desktop/Super%20CRM)

---

## 1. DOCUMENT CONTROL & ARCHITECTURAL CONTEXT
This document serves as the single source of truth (SSOT) and engineering-level blueprint for high-fidelity UI design in Figma and subsequent frontend implementation. It specifies the tokens, component parameters, sitemaps, grid rules, and motion variables for the **Super CRM & HRM** application ecosystem. All design variations, component states, and spacing structures must conform strictly to the numeric definitions contained herein.

### 1.1 Scope of Modules
The design system spans two integrated, permission-gated product modules:
1. **Customer Relationship Management (CRM):** Incorporates operational dashboards, lead management pipelines, sales team performance tables, kanban boards, technical ticketing support, booking scheduling, marketing campaigns, and analytics suites.
2. **Human Resource Management (HRM):** Incorporates employee records management, payroll reporting, training program tracking, talent acquisition pipelines, and business development culture/partnerships portals.

### 1.2 Design Philosophy & Core Principles
*   **High Information Density:** Designed for enterprise users. Information must be readable and clean, utilizing the 8px grid to structure layouts without excessive padding.
*   **Accessibility First:** Focus states must have a high-contrast visual outline, and color palettes must meet WCAG 2.1 AA standards for text and interactive elements.
*   **Figma Variables Matching:** All tokens map directly to Figma variables for consistent design-to-code translation.

---

## 2. GLOBAL DESIGN TOKENS (LIGHT & DARK THEMES)
Design tokens are organized hierarchically: Global Tokens (raw values) -> Alias/Semantic Tokens (functional context) -> Component Tokens (scoped values). Both light and dark theme matrices are explicitly defined below.

### 2.1 Color Token Matrices
Colors are mapped to semantic variables using HSL (Hue, Saturation, Lightness) for precise scaling.

#### 2.1.1 CSS Custom Properties - Complete `:root` Token Block
```css
:root {
  /* ============================================
     COLOR PALETTE - LIGHT THEME (DEFAULT)
     ============================================ */
  --color-light-bg-primary: #F8FAFC;
  --color-light-bg-secondary: #F1F5F9;
  --color-light-bg-card: #FFFFFF;
  --color-light-bg-card-hover: #F8FAFC;
  --color-light-bg-input: #FFFFFF;

  --color-light-border-default: #E2E8F0;
  --color-light-border-focus: #2563EB;

  --color-light-brand-primary: #2563EB;
  --color-light-brand-secondary: #14B8A6;
  --color-light-brand-glow: rgba(37, 99, 235, 0.15);

  --color-light-status-success: #10B981;
  --color-light-status-warning: #F59E0B;
  --color-light-status-danger: #EF4444;
  --color-light-status-info: #06B6D4;

  --color-light-text-primary: #1F2937;
  --color-light-text-secondary: #4B5563;
  --color-light-text-muted: #9CA3AF;
  
  --color-light-sidebar-bg: #1E3A5F;

  /* ============================================
     COLOR PALETTE - DARK THEME
     ============================================ */
  --color-dark-bg-primary: #0F172A;
  --color-dark-bg-secondary: #1E293B;
  --color-dark-bg-card: #1E293B;
  --color-dark-bg-card-hover: #334155;
  --color-dark-bg-input: #0F172A;

  --color-dark-border-default: #334155;
  --color-dark-border-focus: #3B82F6;

  --color-dark-brand-primary: #3B82F6;
  --color-dark-brand-secondary: #2DD4BF;
  --color-dark-brand-glow: rgba(59, 130, 246, 0.25);

  --color-dark-status-success: #34D399;
  --color-dark-status-warning: #FBBF24;
  --color-dark-status-danger: #F87171;
  --color-dark-status-info: #22D3EE;

  --color-dark-text-primary: #F8FAFC;
  --color-dark-text-secondary: #94A3B8;
  --color-dark-text-muted: #64748B;

  --color-dark-sidebar-bg: #0B0F19;

  /* ============================================
     SHOWN CODES / SEMANTIC ALIAS MAPPING
     ============================================ */
  --surface-primary: var(--color-light-bg-primary);
  --surface-secondary: var(--color-light-bg-secondary);
  --surface-card: var(--color-light-bg-card);
  --surface-card-hover: var(--color-light-bg-card-hover);
  --surface-input: var(--color-light-bg-input);

  --border-default: var(--color-light-border-default);
  --border-focus: var(--color-light-border-focus);

  --brand-primary: var(--color-light-brand-primary);
  --brand-secondary: var(--color-light-brand-secondary);
  --brand-glow: var(--color-light-brand-glow);

  --status-success: var(--color-light-status-success);
  --status-warning: var(--color-light-status-warning);
  --status-danger: var(--color-light-status-danger);
  --status-info: var(--color-light-status-info);

  --text-primary: var(--color-light-text-primary);
  --text-secondary: var(--color-light-text-secondary);
  --text-muted: var(--color-light-text-muted);
  
  --sidebar-bg: var(--color-light-sidebar-bg);

  /* ============================================
     SPACING & LAYOUT
     ============================================ */
  --spacing-xxs: 2px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  --spacing-xxxl: 48px;
  --spacing-huge: 64px;

  /* ============================================
     BORDER RADIUS
     ============================================ */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-xl: 16px;
  --radius-xxl: 24px;
  --radius-pill: 9999px;

  /* ============================================
     ELEVATION SHADOWS
     ============================================ */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  --shadow-glow: 0 0 15px var(--color-light-brand-glow);
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface-primary: var(--color-dark-bg-primary);
    --surface-secondary: var(--color-dark-bg-secondary);
    --surface-card: var(--color-dark-bg-card);
    --surface-card-hover: var(--color-dark-bg-card-hover);
    --surface-input: var(--color-dark-bg-input);

    --border-default: var(--color-dark-border-default);
    --border-focus: var(--color-dark-border-focus);

    --brand-primary: var(--color-dark-brand-primary);
    --brand-secondary: var(--color-dark-brand-secondary);
    --brand-glow: var(--color-dark-brand-glow);

    --status-success: var(--color-dark-status-success);
    --status-warning: var(--color-dark-status-warning);
    --status-danger: var(--color-dark-status-danger);
    --status-info: var(--color-dark-status-info);

    --text-primary: var(--color-dark-text-primary);
    --text-secondary: var(--color-dark-text-secondary);
    --text-muted: var(--color-dark-text-muted);
    
    --sidebar-bg: var(--color-dark-sidebar-bg);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.20);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.30);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.40);
    --shadow-glow: 0 0 15px var(--color-dark-brand-glow);
  }
}
```

---

#### 2.1.2 Primary Scale reference Palettes (Exhaustive Color Scales)
##### Blue (Primary Accent) Scale
*   **Blue 50:** `#EFF6FF` | `hsl(221, 100%, 97%)` — Page hover highlights, banner background base elements.
*   **Blue 100:** `#DBEAFE` | `hsl(214, 95%, 93%)` — Badge labels success highlights backdrop.
*   **Blue 200:** `#BFDBFE` | `hsl(213, 97%, 87%)` — Focused outline background shadow overlay base.
*   **Blue 300:** `#93C5FD` | `hsl(212, 96%, 78%)` — Light/Dark theme border line borders.
*   **Blue 400:** `#60A5FA` | `hsl(213, 96%, 68%)` — Inline icon item hover state.
*   **Blue 500:** `#3B82F6` | `hsl(217, 91%, 60%)` — Active interaction accents, default active buttons.
*   **Blue 600:** `#2563EB` | `hsl(221, 83%, 53%)` — Main Brand Primary Color.
*   **Blue 700:** `#1D4ED8` | `hsl(225, 78%, 47%)` — Hover actions button background shades.
*   **Blue 800:** `#1E40AF` | `hsl(226, 70%, 40%)` — Deep pressed button highlights.
*   **Blue 900:** `#1E3A8A` | `hsl(224, 64%, 33%)` — Text overlay headers panel.
*   **Blue 950:** `#172554` | `hsl(226, 56%, 21%)` — Primary dark mode sidebar header frame backdrop.

##### Gray (Neutral Body) Scale
*   **Gray 50:** `#F9FAFB` | `hsl(0, 0%, 98%)` — Canvas body page backgrounds, inner containers.
*   **Gray 100:** `#F3F4F6` | `hsl(220, 14%, 96%)` — Content wells, sidebar navigation lists.
*   **Gray 200:** `#E5E7EB` | `hsl(220, 13%, 91%)` — Outer divider lines, grid borders.
*   **Gray 300:** `#D1D5DB` | `hsl(218, 12%, 83%)` — Form field placeholder outlines, card dividers.
*   **Gray 400:** `#9CA3AF` | `hsl(218, 11%, 65%)` — Static icons backdrop, helper labels descriptions.
*   **Gray 500:** `#6B7280` | `hsl(220, 9%, 46%)` — Sidebar sublabels details, secondary descriptions.
*   **Gray 600:** `#4B5563` | `hsl(215, 14%, 34%)` — Medium weight body text, disabled labels.
*   **Gray 700:** `#374151` | `hsl(217, 19%, 27%)` — Table row details content items.
*   **Gray 800:** `#1F2937` | `hsl(215, 28%, 17%)` — Core high contrast labels.
*   **Gray 900:** `#111827` | `hsl(221, 39%, 11%)` — Primary headings bold text, title headers.
*   **Gray 950:** `#030712` | `hsl(224, 71%, 4%)` — Jet-black dark-mode surface backdrop.

---

### 2.2 Typography Scale & Style Mappings
Typography uses the standard **Inter** web font family. Text styles are built around a proportional type scale optimized for readable information layouts.

#### 2.2.1 Typography System Variables
*   **Primary Font Family:** `font-family-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;`
*   **Monospace Font Family:** `font-family-mono: "Fira Code", "Courier New", Courier, monospace;`
*   **Font Weights:** `Light (300)`, `Regular (400)`, `Medium (500)`, `Semibold (600)`, `Bold (700)`.
*   **Letter Spacing Rules:**
    *   Display/Headings: `-0.02em` or `-0.01em` (adds weight, prevents layout sprawl).
    *   Body Text: `0` or `+0.01em`.
    *   Micro-labels / Small: `+0.03em` or `+0.05em` (all-caps uppercase).

#### 2.2.2 Figma Typography Style Directory (Desktop vs. Mobile)
```
[Folder Path in Figma] -> Typography/Category/Size/Weight
```

| Desktop Figma Style Name | Font Size | Line Height | Font Weight | Letter Spacing | Desktop Usage Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Display/Large` | `32px` | `40px (1.25x)`| `Bold (700)` | `-0.02em` | Authentication big screens, dashboards KPI summary values |
| `Display/Medium` | `28px` | `36px (1.28x)`| `Semibold (600)`| `-0.02em` | Main section headings (Sales Kanban page, HRM personal record) |
| `Heading/H1` | `24px` | `32px (1.33x)`| `Semibold (600)`| `-0.01em` | Primary page headers (Analytics page, Support dashboard) |
| `Heading/H2` | `20px` | `28px (1.40x)`| `Semibold (600)`| `-0.01em` | Card titles, nested section titles |
| `Heading/H3` | `18px` | `24px (1.33x)`| `Medium (500)` | `0` | Small widgets, popup header names |
| `Body/Large` | `16px` | `24px (1.50x)`| `Regular (400)` | `0` | Introductory text, email message body |
| `Body/Medium` | `14px` | `22px (1.57x)`| `Regular (400)` | `0` | General table row cells, input label items |
| `Body/Medium Semibold` | `14px` | `22px (1.57x)`| `Semibold (600)`| `0` | Active tab headers, primary actions text, tables headers |
| `Body/Small` | `12px` | `18px (1.50x)`| `Regular (400)` | `+0.01em` | Helper info texts, subtext tags, breadcrumbs |
| `Body/Small Medium` | `12px` | `18px (1.50x)`| `Medium (500)` | `+0.01em` | Badges, pills, metadata summaries |
| `Caption` | `10px` | `14px (1.40x)`| `Bold (700)` | `+0.05em (Caps)`| Table column sub-headers, sparkline indicator limits |

| Mobile/Tablet Style Name | Font Size | Line Height | Font Weight | Letter Spacing | Mobile Usage Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `M-Display/Large` | `28px` | `36px` | `Bold (700)` | `-0.02em` | Auth greeting titles |
| `M-Heading/H1` | `20px` | `28px` | `Semibold (600)`| `-0.01em` | Main content page header title |
| `M-Heading/H2` | `18px` | `24px` | `Semibold (600)`| `-0.01em` | Card widgets, lists sections |
| `M-Body/Large` | `15px` | `22px` | `Regular (400)` | `0` | Popups body description |
| `M-Body/Medium` | `13px` | `18px` | `Regular (400)` | `0` | Lists contents, forms inputs fields |
| `M-Body/Small` | `11px` | `16px` | `Medium (500)` | `+0.02em` | Tiny detail badges, timestamps |

---

### 2.3 Spacing & Layout Incremental Scales
The design system enforces a strict **8-pixel grid structure** with a **4-pixel subdivision (micro-grid)** for fine details (such as icons, button margins, and line heights).

| Spacing Token | Pixel Value | Target Usage Guideline |
| :--- | :--- | :--- |
| `spacing-xxs` | `2px` | Nested badge outline paddings, close icons margins |
| `spacing-xs` | `4px` | Text-to-icon spacing, nested form label margins |
| `spacing-sm` | `8px` | Core padding for small lists, elements gap inside input groups |
| `spacing-md` | `12px` | Button horizontal internal padding, small list item spacing |
| `spacing-lg` | `16px` | Grid card interior padding, generic page component gutters |
| `spacing-xl` | `24px` | Layout elements gaps, main form column layout gaps |
| `spacing-xxl` | `32px` | Page content margins, header spacing boundaries |
| `spacing-xxxl`| `48px` | Hero graphic alignments, login card outer margins |
| `spacing-huge` | `64px` | Splash screens, structural sections dividers |

---

### 2.4 Border & Corner Radius System
Consistently applied corner rounded shapes guarantee that elements display clean hierarchy relations.

| Radius Token | Pixel Value | Application Example |
| :--- | :--- | :--- |
| `radius-xs` | `2px` | Radio button dot centers, checkbox inputs |
| `radius-sm` | `4px` | Context menus dropdown outlines, tooltips windows |
| `radius-md` | `6px` | Buttons, text field border walls, list indicators |
| `radius-lg` | `10px` | Small widget cards, popover models |
| `radius-xl` | `16px` | Standard page components, modular containers, modal wrapper frames |
| `radius-xxl`| `24px` | Sidebars cards, layout structures, detail drawer windows |
| `radius-pill`| `9999px` | Circular badges, avatars, user tags |

#### 2.4.1 Stroke Width Tokens
*   `stroke-thin`: `1px` (standard input fields, card borders, lines dividers).
*   `stroke-thick`: `2px` (active/focus text input outlines, checked boxes, highlight outlines).
*   `stroke-heavy`: `3px` (indicator focus bars, active drag border panels).

---

### 2.5 Elevation & Shadow Specifications
Figma drop shadow styles use the structure `(X, Y, Blur, Spread, Color, Opacity)`. Elevations are calibrated to translate cleanly into CSS `box-shadow` styles.

#### 2.5.1 Light Theme Shadow Configurations
*   **`elevation-none`:** No shadow overlay. (Fitted flat components).
*   **`elevation-sm` (Shadow Small):**
    *   Figma Setup: `Drop Shadow: Y: 1px, X: 0px, Blur: 3px, Spread: 0px, Color: #000000, Opacity: 5%`
    *   Figma Setup 2: `Drop Shadow: Y: 1px, X: 0px, Blur: 2px, Spread: 0px, Color: #000000, Opacity: 8%`
    *   CSS Reference: `box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.08);`
    *   *Usage:* Normal cards, table row details.
*   **`elevation-md` (Shadow Medium):**
    *   Figma Setup: `Drop Shadow: Y: 4px, X: 0px, Blur: 6px, Spread: -1px, Color: #000000, Opacity: 5%`
    *   Figma Setup 2: `Drop Shadow: Y: 2px, X: 0px, Blur: 4px, Spread: -1px, Color: #000000, Opacity: 5%`
    *   CSS Reference: `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.05);`
    *   *Usage:* Dropdown lists menus, user panel details, modal boxes.
*   **`elevation-lg` (Shadow Large):**
    *   Figma Setup: `Drop Shadow: Y: 10px, X: 0px, Blur: 15px, Spread: -3px, Color: #000000, Opacity: 10%`
    *   Figma Setup 2: `Drop Shadow: Y: 4px, X: 0px, Blur: 6px, Spread: -2px, Color: #000000, Opacity: 5%`
    *   CSS Reference: `box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);`
    *   *Usage:* Active dialogue panels, popovers windows.
*   **`elevation-glow`:**
    *   Figma Setup: `Drop Shadow: Y: 0px, X: 0px, Blur: 15px, Spread: 0px, Color: #2563EB, Opacity: 15%`
    *   CSS Reference: `box-shadow: 0 0 15px var(--accent-glow);`
    *   *Usage:* Focus buttons highlights, active CRM indicators.

#### 2.5.2 Dark Theme Shadow Configurations
*   **`elevation-none`:** No shadow overlay.
*   **`elevation-sm` (Shadow Small):**
    *   Figma Setup: `Drop Shadow: Y: 1px, X: 0px, Blur: 3px, Spread: 0px, Color: #000000, Opacity: 20%`
    *   CSS Reference: `box-shadow: 0 1px 3px rgba(0,0,0,0.20);`
    *   *Usage:* Normal cards, table row details.
*   **`elevation-md` (Shadow Medium):**
    *   Figma Setup: `Drop Shadow: Y: 4px, X: 0px, Blur: 6px, Spread: -1px, Color: #000000, Opacity: 30%`
    *   CSS Reference: `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.30);`
    *   *Usage:* Dropdown lists menus, user panel details, modal boxes.
*   **`elevation-lg` (Shadow Large):**
    *   Figma Setup: `Drop Shadow: Y: 10px, X: 0px, Blur: 15px, Spread: -3px, Color: #000000, Opacity: 40%`
    *   CSS Reference: `box-shadow: 0 10px 15px -3px rgba(0,0,0,0.40);`
    *   *Usage:* Active dialogue panels, popovers windows.
*   **`elevation-glow`:**
    *   Figma Setup: `Drop Shadow: Y: 0px, X: 0px, Blur: 15px, Spread: 0px, Color: #3B82F6, Opacity: 25%`
    *   CSS Reference: `box-shadow: 0 0 15px rgba(59,130,246,0.25);`
    *   *Usage:* Focus buttons highlights, active CRM indicators.

---

## 3. LAYOUT, RESPONSIBILITY & DESIGN GRIDS

### 3.1 Breakpoint Directives
Responsive views are designed to match standard screen dimensions. Design columns scale dynamically while gutters and margins remain constant.

| Screen Type | Width Boundaries (Min - Max) | Columns Count | Columns Behavior | Outside Margins | Columns Gaps (Gutter) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `320px` to `480px` | `4` | Stretch (Fluid) | `16px` | `16px` |
| **Tablet** | `481px` to `1024px` | `8` | Stretch (Fluid) | `24px` | `20px` |
| **Desktop** | `1025px` to `1440px` | `12` | Stretch (Fluid) | `32px` | `24px` |
| **Wide Desktop**| `1441px` to `1920px` | `12` | Fixed (Max 1400px width) | `Auto` | `24px` |

---

### 3.2 Layout Framework (Desktop Workspace Layout)
Desktop designs use a nested Auto-Layout framework consisting of the Sidebar, Top Header, and Main Content viewport.

```
+-----------------------------------------------------------------------+
|  LOGO  |  TOP BAR (Page Title, Search, User Initials, Aux Buttons)   |
| (260px)|  Height: 72px                                                |
+--------+--------------------------------------------------------------+
|  CRM / |                                                              |
|  HRM   |  MAIN WORKSPACE PORT                                         |
|  NAV   |  Padding: 32px (All sides)                                   |
|        |  Columns: 12                                                 |
|        |  Gutter: 24px                                                |
| (260px)|                                                              |
+--------+--------------------------------------------------------------+
```

1.  **Sidebar Parent Container:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Top-Left. Width: 260px. Height: Fill container (100vh). Padding: 24px (Top/Bottom), 16px (Left/Right). Gap: 24px.`
    *   Collapsing Rules: Collapses to `72px` width for compact mode. When collapsed, text labels hide, and nav items display as centered icons.
2.  **Top Header Container:**
    *   Figma Setup: `Auto Layout: Horizontal. Align: Middle-Space Between. Height: 72px. Width: Stretch (100% minus Sidebar width). Padding: 0 32px. Borders: Bottom divider line (1px, stroke-thin, border-default).`
3.  **Main Content Viewport:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Top-Left. Padding: 32px. Gap: 24px. Height: Auto (scrolls vertically).`

---

## 4. INFORMATION ARCHITECTURE & PAGE LAYOUTS

```
                        +----------------------------+
                        |        Global Login        |
                        +--------------+-------------+
                                       |
                     +-----------------+-----------------+
                     |                                   |
           +---------v---------+               +---------v---------+
           |   CRM Workspace   |               |   HRM Workspace   |
           +---------+---------+               +---------+---------+
                     |                                   |
  +------------------+------------------+     +------------------+------------------+
  | - Dashboard (Analytics summaries)   |     | - HRM Dashboard (Employee summaries)|
  | - Leads (Filterable tables, detail) |     | - Personal (Records, contracts)     |
  | - Teams (Directory, roles)          |     | - Payroll (Payslips, bonuses)       |
  | - Training (Courses, progress)      |     | - Talent Acquisition (Recruiting)   |
  | - Technical Issues (Tickets systems)|     | - BD & Culture (Partnerships)       |
  | - Bookings (Calendar listings)      |     +-------------------------------------+
  | - Campaigns (Marketing campaigns)   |
  | - Analytics (Operational reports)   |
  | - System Settings (Admin tools)     |
  +-------------------------------------+
```

### 4.1 Detailed Page Architecture & Wireframe Layout Specs

#### 4.1.1 Dashboard Page (`/dashboard`)
*   **Visual Layout Grid:**
    *   *Row 1 (KPI Metrics):* 4 Columns (Grid columns: 1-3, 4-6, 7-9, 10-12). Auto-layout spacing: `24px`.
    *   *Row 2 (Trend Charts):* 2 Columns (Grid columns: 1-6, 7-12). Auto-layout spacing: `24px`.
    *   *Row 3 (Recent Activity List):* 1 Column (Grid columns: 1-12).
*   **Primary Data Bindings:** Live counts of Leads, Conversions, Active tickets, and Email performance stats.
*   **Aesthetic Details:** Neon status dot indicators for critical alerts. Smooth card hover lifts (Y: -2px, ease-out, 150ms).

#### 4.1.2 Leads Page (`/leads`)
*   **Visual Layout Grid:** Split pane details layout.
    *   *Left Filter Panel:* Fixed width `280px`. Auto-layout: Vertical. Gap: `16px`.
    *   *Right Table Area:* Stretch (Grid columns: 4-12). Auto-layout: Vertical. Gap: `12px`.
*   **Components Included:** Lead status badges, pipeline search inputs, bulk selection checkboxes, data table row list with inline actions button dropdown (view, edit, delete).
*   **Aesthetic Details:** Alternating background card lists, status borders matching lead status categorization (Hot: Red border, Warm: Yellow border, Cold: Blue border).

#### 4.1.3 Sales Kanban Page (`/kanban`)
*   **Visual Layout Grid:** Horizontal scroll scrollbar well.
    *   *Columns (Stage Lanes):* 4 columns (Width: `320px` each, height: fill content viewport). Gap: `16px`. Horizontal layout.
*   **Components Included:** Stage header badges with inline item count labels, draggable card elements with profile avatar icons, priority tags, and deadline alerts.
*   **Aesthetic Details:** Drag-over landing states show a dashed border box (2px, border-focus, opacity 40%).

#### 4.1.4 Support Tickets Page (`/tickets`)
*   **Visual Layout Grid:** 3 Columns layout.
    *   *Left Pane (Ticket Queue):* Width: `380px`. Auto-layout: Vertical. Gap: `12px`.
    *   *Right Pane (Ticket Thread details):* Stretch (fills viewport). Auto-layout: Vertical. Padding: `24px`.
*   **Components Included:** Priority level tag list, customer information header, inline chat thread container with file attachment uploader, and quick status action bar.
*   **Aesthetic Details:** Chat messages use speech bubbles with border radius highlights (User: Brand-primary with white text; Customer: bg-secondary with text-primary).

#### 4.1.5 Campaign Form Page (`/campaigns/new`)
*   **Visual Layout Grid:** Central card layout.
    *   *Form Wrapper:* Fixed width `720px`. Centered in viewport. Padding: `32px`. Gap: `24px`.
*   **Components Included:** Field labels, text input placeholder elements, select category dropdown lists, range sliders (Budget, Target Reach), toggle switches (Email distribution active), and footer CTA action buttons.
*   **Aesthetic Details:** Stepper visual indicator header showing progress coordinates. Active forms field outlines highlighted in Blue 600.

#### 4.1.6 HRM Dashboard Page (`/hrm`)
*   **Visual Layout Grid:**
    *   *Row 1 (Headcounts):* 3 columns (Grid columns: 1-4, 5-8, 9-12).
    *   *Row 2 (Attendance Grid):* 1 column (Grid columns: 1-12).
    *   *Row 3 (Recruiting & Openings):* 2 columns (Grid columns: 1-6, 7-12).
*   **Components Included:** Employee count cards, attendance trackers, training indicators, talent pipelines.
*   **Aesthetic Details:** Custom circular charts showing progress rates. Soft card outlines in dark mode.

#### 4.1.7 HRM Personal Records Page (`/hrm/personal`)
*   **Visual Layout Grid:** Split pane details layout.
    *   *Left Profile Sidebar:* Width: `320px`. Auto-layout: Vertical. Padding: `24px`.
    *   *Right Profile Content:* Stretch (fills viewport). Auto-layout: Vertical. Gap: `24px`.
*   **Components Included:** User avatar image upload, personal details fields, contract history table, performance reviews accordion list.
*   **Aesthetic Details:** High-contrast label details, clean layouts, focus outlines on interactive components.

---

### 4.3 Page Router Configuration & Permission Matrix
The navigation sidebar displays menu options conditionally based on the user's role.

| Sidebar Item | URL Path | Required User Role (CRM / HRM) |
| :--- | :--- | :--- |
| **CRM Dashboard** | `/dashboard` | All authenticated users |
| **Leads Directory** | `/leads` | Admins, Sales Agents/Managers, Marketing, Executives, Analysts |
| **Teams List** | `/teams` | Admins, Architects, Sales Managers, Support Managers, Marketing |
| **Sales Kanban** | `/kanban` | Admins, Sales Agents/Managers, Executives, Analysts |
| **Technical Issues** | `/tickets` | All authenticated users |
| **Bookings Calendar** | `/bookings` | Sales, Support, Developers, Admins |
| **Campaigns Manager**| `/campaigns` | Admins, Marketing Specialists/Managers, Executives, Analysts |
| **Analytics Suite** | `/analytics` | Admins, Executives, Analysts, Architects |
| **User Settings** | `/settings` | Super CRM Administrators |
| **HRM Dashboard** | `/hrm` | All HRM Authorized roles |
| **Personal Records** | `/hrm/personal` | Admins, HR Managers/Specialists/Partners, Employee (Self-access) |
| **Payroll Manager** | `/hrm/payroll` | Admins, HR Managers, Payroll Specialists, Employee (Self-access) |
| **Talent Recruiter** | `/hrm/talent` | Admins, HR Managers, Recruitment Specialists |

---

## 5. DETAILED COMPONENT LIBRARY & STATE MATRIX

All Figma components must be designed as local components utilizing **Figma Variables** for colors and **Figma Component Properties** (Variants, Booleans, Text, and Instance Swaps) for configuration.

---

### 5.1 Button Components
Buttons are designed with consistent padding, heights, and corner radii. They are configured as variants with distinct state styles.

```
       [Primary Button]                    [Secondary Button]                   [Tertiary Button]
+----------------------------+      +----------------------------+      +----------------------------+
|        Primary Label       |      |      Secondary Label       |      |       Tertiary Label       |
+----------------------------+      +----------------------------+      +----------------------------+
| Fill: brand-primary        |      | Fill: Transparent          |      | Fill: Transparent          |
| Border: None               |      | Border: border-default     |      | Border: None               |
| Text: white / dark-primary |      | Text: text-primary         |      | Text: brand-primary        |
+----------------------------+      +----------------------------+      +----------------------------+
```

#### 5.1.1 Button Auto-Layout Specifications
*   **Large Size Variant:** Height: `48px`. Horizontal Padding: `24px`. Vertical Padding: `12px`. Gap: `8px`. Radius: `radius-md`. Text Style: `Body/Medium Semibold`.
*   **Medium Size Variant (Default):** Height: `40px`. Horizontal Padding: `16px`. Vertical Padding: `8px`. Gap: `8px`. Radius: `radius-md`. Text Style: `Body/Medium Semibold`.
*   **Small Size Variant:** Height: `32px`. Horizontal Padding: `12px`. Vertical Padding: `6px`. Gap: `4px`. Radius: `radius-sm`. Text Style: `Body/Small Medium`.

#### 5.1.2 Button State Matrix (Medium Size)
*   **Primary Button:**
    *   *Default:* Fill: `brand-primary`. Text: White. Border: None. Shadow: `elevation-sm`.
    *   *Hover:* Fill: `brand-primary` with +10% lightness scale change (Light: `#3B82F6`, Dark: `#60A5FA`). Text: White. Cursor: Pointer.
    *   *Active:* Fill: `brand-primary` with -10% lightness scale change (Light: `#1D4ED8`, Dark: `#1D4ED8`). Text: White. Shadow: `elevation-none`.
    *   *Focus:* Fill: `brand-primary`. Text: White. Stroke: `2px` focus outline (Color: `border-focus`, offset margin: `2px`). Shadow: `elevation-glow`.
    *   *Disabled:* Fill: `border-default`. Text: `text-muted`. Border: None. Shadow: `elevation-none`. Cursor: Not-allowed.
*   **Secondary Button:**
    *   *Default:* Fill: Transparent. Text: `text-primary`. Border: `1px` solid `border-default`.
    *   *Hover:* Fill: `bg-secondary`. Text: `text-primary`. Border: `1px` solid `border-default`.
    *   *Active:* Fill: `border-default`. Text: `text-primary`. Border: `1px` solid `border-default`.
    *   *Focus:* Fill: Transparent. Text: `text-primary`. Border: `1px` solid `border-focus`. Shadow: `elevation-glow`.
    *   *Disabled:* Fill: Transparent. Text: `text-muted`. Border: `1px` solid `border-default` (opacity 50%).
*   **Tertiary Text Button:**
    *   *Default:* Fill: Transparent. Text: `brand-primary`. Border: None.
    *   *Hover:* Fill: `brand-glow` (opacity 10%). Text: `brand-primary`. Border: None.
    *   *Active:* Fill: `brand-glow` (opacity 20%). Text: `brand-primary`. Border: None.
    *   *Focus:* Fill: Transparent. Text: `brand-primary`. Stroke: `2px` outline (Color: `border-focus`).
    *   *Disabled:* Fill: Transparent. Text: `text-muted`. Border: None.
*   **Icon-Only Button (Medium Size):**
    *   *Default:* Width: `40px`. Height: `40px`. Auto-layout: Centered. Icon size: `18px`. Border: `1px` solid `border-default`. Radius: `radius-md`.
*   **Split Dropdown Button:**
    *   *Structure:* Two adjacent elements wrapped in a horizontal layout. Left element is a standard button, right element is a `40px` dropdown button, separated by a `1px` solid vertical divider.

---

### 5.2 Form Input Components
Inputs feature structured layouts with clear labels, states, helper text, and validation styles.

#### 5.2.1 Text Fields & Text Areas
*   **Input Box Auto-Layout:**
    *   Figma Setup: `Auto Layout: Horizontal. Align: Middle-Left. Height: 40px. Padding: 10px 14px. Gap: 8px. Radius: radius-md. Border: 1px (border-default). Fill: bg-input.`
    *   Input Content Elements: Leading Icon (Figma instance placeholder: `16px`, Color: `text-muted`), Text Area (Figma text input: `Body/Medium`, Color: `text-primary`), Trailing Icon/Button (Figma instance placeholder: `16px`, Color: `text-muted`).
*   **Form Field Wrapper Container:**
    *   Figma Setup: `Auto Layout: Vertical. Gap: 6px. Width: Stretch (or Fixed).`
    *   Wrapper Content Elements: Label Text (`Body/Small Medium`, Color: `text-primary`), Input Box component, Helper/Error Text (`Body/Small`, Color: `text-secondary`).
*   **Text Area (Multi-line Input):**
    *   Figma Setup: `Height: 120px. Padding: 12px 14px. Align: Top-Left.`

#### 5.2.2 Form Input State Matrix
*   **Empty Default State:** Input Box border: `border-default`. Text: `text-muted` (Placeholder text).
*   **Filled Default State:** Input Box border: `border-default`. Text: `text-primary`.
*   **Hover State:** Input Box border: `text-muted` (Light: `#9CA3AF`, Dark: `#64748B`). Text: `text-primary`.
*   **Focus State (Active Entry):** Input Box border: `border-focus` (thick 2px stroke). Text: `text-primary`. Shadow: `elevation-glow`.
*   **Disabled State:** Input Box fill: `bg-secondary`. Input Box border: `border-default` (opacity 50%). Text: `text-muted`. Cursor: Not-allowed.
*   **Error State:** Input Box border: `status-danger`. Helper/Error text: `status-danger`. Trailing Icon swaps to a warning icon (Color: `status-danger`).

#### 5.2.3 Select Dropdown Component
*   **Dropdown Selector Input:** Same auto-layout and dimensions as standard text input, but features a trailing chevron icon (Color: `text-secondary`).
*   **Dropdown Menu Overlay:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Top-Left. Width: Width of input box. Max-Height: 280px (Scrollable). Padding: 6px. Gap: 2px. Radius: radius-lg. Border: 1px (border-default). Fill: bg-card. Shadow: elevation-md.`
    *   Dropdown Item Element: Auto Layout: Horizontal. Align: Middle-Left. Height: 36px. Padding: 8px 12px. Gap: 8px. Radius: `radius-sm`. Text: `Body/Medium`, Color: `text-primary`.
    *   Dropdown Item States:
        *   *Default:* Fill: Transparent.
        *   *Hover:* Fill: `bg-secondary`. Text: `text-primary`.
        *   *Selected:* Fill: `brand-glow` (opacity 15%). Text: `brand-primary`. Trailing checkmark icon visible (Color: `brand-primary`).

---

### 5.3 Selection Controls

#### 5.3.1 Checkbox Component
*   **Structure:** Single square frame measuring `16px * 16px`. Radius: `radius-xs`.
*   **State Settings:**
    *   *Unchecked Default:* Fill: `bg-input`. Border: `1.5px` solid `border-default`.
    *   *Unchecked Hover:* Border: `text-muted`.
    *   *Checked Default:* Fill: `brand-primary`. Border: None. Inner check icon: White, sized `10px * 10px`.
    *   *Checked Hover:* Fill: `brand-primary` (hover shade).
    *   *Disabled:* Fill: `bg-secondary`. Border: `border-default`. Inner check icon (if checked): `text-muted`.

#### 5.3.2 Radio Button Component
*   **Structure:** Circular border frame measuring `16px * 16px`. Radius: `radius-pill` (circular).
*   **State Settings:**
    *   *Unchecked Default:* Fill: `bg-input`. Border: `1.5px` solid `border-default`.
    *   *Checked Default:* Fill: `bg-input`. Border: `1.5px` solid `brand-primary`. Inner circle dot: Filled `brand-primary` measuring `8px * 8px`.
    *   *Disabled:* Fill: `bg-secondary`. Border: `border-default` (opacity 50%). Inner dot (if checked): `text-muted`.

#### 5.3.3 Toggle Switch Component
*   **Structure:** Pill-shaped outer track frame measuring `36px * 20px`. Radius: `radius-pill`. Slider knob inside is a circle measuring `16px * 16px`. Radius: `radius-pill`.
*   **Auto-Layout Configuration:**
    *   *Off State:* Auto Layout: Horizontal. Align: Left. Padding: `2px`. Fill: `border-default` (Light: `#E2E8F0`, Dark: `#334155`). Knob Fill: White.
    *   *On State:* Auto Layout: Horizontal. Align: Right. Padding: `2px`. Fill: `brand-primary` (Light: `#2563EB`, Dark: `#3B82F6`). Knob Fill: White.
    *   *Disabled State:* Track opacity reduced to 50%.

---

### 5.4 Data Tables
Data tables display large datasets clearly. Columns feature responsive auto-layout structures to align data properly.

#### 5.4.1 Table Header Cell
*   **Auto-Layout:** Auto Layout: Horizontal. Align: Middle-Left. Padding: `12px 16px`. Height: `44px`. Border: Bottom border `1px` solid `border-default`. Fill: `bg-secondary`.
*   **Content:** Text style `Caption` uppercase. Color: `text-secondary`. Features sorting indicator chevron icon (12px, Color: `text-muted`).

#### 5.4.2 Table Body Data Row
*   **Auto-Layout:** Auto Layout: Horizontal. Align: Middle-Left. Padding: `16px`. Height: `56px`. Border: Bottom border `1px` solid `border-default`. Fill: `bg-card`.
*   **Text Details:** Cell text uses `Body/Medium` font, colored `text-primary`. Status values are wrapped inside colored badges.
*   **State Settings:**
    *   *Default State:* Fill: `bg-card`.
    *   *Hover State:* Fill: `bg-card-hover` (Light: `#F8FAFC`, Dark: `#334155`). Cursor: Pointer.
    *   *Selected State:* Fill: `brand-glow` (opacity 10%). Border: Bottom border: `1px` solid `border-default`.
    *   *Focused State (Keyboard Navigation):* Outline: `2px` solid `border-focus` (inset).

#### 5.4.3 Table Pagination Footer Panel
*   **Auto-Layout:** Auto Layout: Horizontal. Align: Middle-Space Between. Height: `56px`. Padding: `0 24px`. Border: Top border `1px` solid `border-default`. Fill: `bg-card`.
*   **Content Layout:** Left side displays showing counts text (`Body/Small`, Color: `text-secondary`). Right side features a navigation panel with Page selector buttons (Previous, active page number button, secondary pages numbers, Next).

---

### 5.5 KPI Metric Cards
KPI cards display high-level metrics cleanly. They use vertical auto-layout structures to organize labels and trend indicators.

#### 5.5.1 Auto-Layout Configuration
*   **Structure:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Top-Left. Width: Stretch (1-column of 4-column row). Height: Hug (approx 140px). Padding: 20px. Gap: 12px. Radius: radius-xl. Border: 1px solid (border-default). Fill: bg-card. Shadow: elevation-sm.`
*   **Internal Layout Sections:**
    *   *Top Section (Horizontal Auto Layout):* Label title (`Caption` text style, Color: `text-secondary`) and top right visual trend icon or sparkline box (Width: `48px`, Height: `24px`).
    *   *Middle Section (Vertical Auto Layout):* Large value indicator (`Display/Large` text style, Color: `text-primary`).
    *   *Bottom Section (Horizontal Auto Layout):* Status delta pill badge and MoM period description (`Body/Small` text style, Color: `text-muted`).

---

### 5.6 Charts & Data Visualization Layouts
Charts use non-interactive graphics in Figma and display precise legends, gridlines, and axes.

#### 5.6.1 Layout Elements
*   **Gridlines:** Stroke thickness: `1px`. Stroke Style: Dashed (`4px` dash, `4px` gap). Color: `border-default`.
*   **Chart Lines:** Stroke thickness: `3px`. Smooth curves: Bezier. Colors: Brand colors (`brand-primary`, `brand-secondary`, `status-success`).
*   **Axes Labels:** Text style `Body/Small`. Color: `text-muted`. Grid boundary lines offset `8px` from outer coordinates.
*   **Chart Tooltips:**
    *   Figma Setup: `Auto Layout: Vertical. Padding: 10px 12px. Gap: 4px. Radius: radius-md. Fill: color-dark-bg-primary (inverted in light theme). Shadow: elevation-md.`
    *   Content: Date line (`Body/Small Semibold`, White text) and value indicator list with colored indicators dot (`Body/Small`, Color: `text-muted`).

---

### 5.7 Navigational Components

#### 5.7.1 Sidebar Navigation Item
*   **Auto-Layout Structure:** Auto Layout: Horizontal. Align: Middle-Left. Height: `44px`. Padding: `10px 16px`. Gap: `12px`. Radius: `radius-md`.
*   **Content:** Leading Icon (`18px`, Color: `text-secondary`), Nav Label text (`Body/Medium Semibold`, Color: `text-secondary`).
*   **State Settings:**
    *   *Default State:* Fill: Transparent. Icon and Text: `text-secondary` (Dark theme: `color-dark-text-secondary`).
    *   *Hover State:* Fill: `rgba(255, 255, 255, 0.08)`. Icon and Text: White.
    *   *Active State (Selected Route):* Fill: `brand-primary`. Icon and Text: White.
    *   *Collapsed State:* Width: `44px`. Nav Label text hidden. Icon centered inside parent container.

#### 5.7.2 Tab Headers (Horizontal Style)
*   **Auto-Layout:** Auto Layout: Horizontal. Align: Bottom-Left. Gap: `24px`. Border: Bottom container divider line `1px` solid `border-default` runs behind tabs.
*   **Tab Button Element:** Auto Layout: Vertical. Align: Centered. Padding: `12px 4px`. Gap: `8px`.
*   **Tab States:**
    *   *Default (Inactive):* Text style `Body/Medium Semibold`. Color: `text-secondary`.
    *   *Hover:* Text color: `text-primary`.
    *   *Active State:* Text color: `brand-primary`. Active state bottom indicator bar is a `2px` stroke (Color: `brand-primary`) positioned flat against the container divider line.

---

### 5.8 Dialogs & Drawer Panels
Dialogs overlay the main content and require user action to dismiss.

#### 5.8.1 Modal Dialog Box Container
*   **Overlay Screen Filter:** Background Fill: `#0F172A` (Light/Dark themes). Opacity: `60%`.
*   **Container Box Auto-Layout:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Top-Left. Width: Standard 540px (or Medium 680px, Large 960px). Max-Height: 90vh (Scrollable inner box). Radius: radius-xl. Border: 1px solid (border-default). Fill: bg-card. Shadow: elevation-lg.`
*   **Header Section Layout:** Auto Layout: Horizontal. Align: Middle-Space Between. Padding: `24px 32px`. Border: Bottom border `1px` solid `border-default`. Text: `Heading/H2`, Color: `text-primary`. Features standard close icon button (Color: `text-secondary`).
*   **Body Content Layout:** Auto Layout: Vertical. Padding: `32px`. Gap: `20px`. Overflow-y: Scroll.
*   **Footer Action Layout:** Auto Layout: Horizontal. Align: Middle-Right (or Middle-Space Between for step models). Padding: `20px 32px`. Border: Top border `1px` solid `border-default`. Gap: `12px`.

#### 5.8.2 Slide-out Details Drawer (Side Drawer)
*   **Structure:** Slides out from the right viewport boundary over the main workspace content.
*   **Auto-Layout:** Height: `100vh` (fills vertical viewport). Width: `480px` (or `640px` for wide forms). Border: Left border `1px` solid `border-default`. Fill: `bg-card`. Shadow: `elevation-lg`.

---

### 5.9 Badges & Status Tags
Badges display categorical status values in cards, lists, and tables.

#### 5.9.1 Auto-Layout Configuration
*   **Structure:** Auto Layout: Horizontal. Align: Middle-Center. Height: `24px`. Padding: `4px 10px`. Gap: `4px`. Radius: `radius-pill`.

#### 5.9.2 Categorical Style Tokens
*   **Success Status (e.g., Active, Converted, Completed):**
    *   *Light Theme:* Fill: `rgba(16,185,129,0.1)`. Text color: `hsl(161, 84%, 30%)`.
    *   *Dark Theme:* Fill: `rgba(52,211,153,0.15)`. Text color: `#34D399`.
*   **Warning Status (e.g., Pending, Under Review):**
    *   *Light Theme:* Fill: `rgba(245,158,11,0.1)`. Text color: `hsl(38, 92%, 40%)`.
    *   *Dark Theme:* Fill: `rgba(251,191,36,0.15)`. Text color: `#FBBF24`.
*   **Danger Status (e.g., Closed, Canceled, Failed):**
    *   *Light Theme:* Fill: `rgba(239,68,68,0.1)`. Text color: `hsl(0, 84%, 45%)`.
    *   *Dark Theme:* Fill: `rgba(248,113,113,0.15)`. Text color: `#F87171`.
*   **Info Status (e.g., New, Scheduled, System):**
    *   *Light Theme:* Fill: `rgba(6,182,212,0.1)`. Text color: `hsl(188, 86%, 35%)`.
    *   *Dark Theme:* Fill: `rgba(34,211,238,0.15)`. Text color: `#22D3EE`.

---

### 5.10 Toast Alerts & Banners
Toasts display system feedback temporarily in the top-right or bottom-right viewport coordinates.

#### 5.10.1 Auto-Layout Configuration
*   **Structure:**
    *   Figma Setup: `Auto Layout: Horizontal. Align: Top-Left (Vertical wrap elements next to icon). Width: 380px. Padding: 16px. Gap: 12px. Radius: radius-lg. Border: 1px solid (border-default). Fill: bg-card. Shadow: elevation-md.`
*   **Internal Layout Elements:**
    *   *Leading Icon:* `20px` square validation icon. Color: Linked to status theme (Success, Warning, Danger, Info).
    *   *Message Area (Vertical Auto Layout):* Header title (`Body/Medium Semibold`, Color: `text-primary`) and description body (`Body/Small`, Color: `text-secondary`).
    *   *Close Action Button:* Trailing close icon button (16px, Color: `text-muted`).

---

### 5.11 Kanban Board Components
Kanban board components display task lists and support drag-and-drop interactions.

#### 5.11.1 Kanban Column Container
*   **Auto-Layout:** Auto Layout: Vertical. Align: Top-Left. Width: `320px`. Height: Fill container. Padding: `16px 12px`. Gap: `12px`. Fill: `bg-secondary`. Radius: `radius-xl`.
*   **Header Section:** Auto Layout: Horizontal. Align: Middle-Space Between. Height: `32px`. Text style `Body/Medium Semibold`. Color: `text-primary`. Includes counter indicator (Pill-shaped tag showing item count).

#### 5.11.2 Kanban Task Card Component
*   **Auto-Layout:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Top-Left. Width: Stretch. Padding: 16px. Gap: 12px. Radius: radius-lg. Border: 1px solid (border-default). Fill: bg-card. Shadow: elevation-sm.`
*   **Card State Settings:**
    *   *Default State:* Fill: `bg-card`. Shadow: `elevation-sm`. Border: `border-default`.
    *   *Hover State:* Border: `text-muted`. Shadow: `elevation-md`. Cursor: Grab pointer.
    *   *Dragging State:* Opacity: `60%`. Rotation angle: `2deg` (offset skew). Border: `2px` dashed `brand-primary`. Shadow: `elevation-lg`. Cursor: Grabbing pointer.

---

### 5.12 Navigational Breadcrumbs
Breadcrumbs show the user's location within the page hierarchy.

*   **Auto-Layout Configuration:**
    *   Figma Setup: `Auto Layout: Horizontal. Align: Middle-Left. Height: 24px. Padding: 0. Gap: 8px.`
*   **Breadcrumb Item:**
    *   *Standard:* Text style `Body/Small`. Color: `text-secondary`. Cursor: Pointer.
    *   *Separator:* Chevron icon (12px, Color: `text-muted`).
    *   *Active (Current Page):* Text style `Body/Small Medium`. Color: `text-primary`. Non-clickable.

---

### 5.13 Date & Time Picker Dropdown Component
The date picker dropdown overlay displays calendar rows for date selection.

*   **Dropdown Selector Input:** Height: `40px`. Padding: `10px 14px`. Leading Icon: Calendar icon. Trailing chevron.
*   **Calendar Grid Container:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Top-Left. Width: 280px. Padding: 16px. Gap: 12px. Border: 1px solid (border-default). Fill: bg-card. Radius: radius-lg. Shadow: elevation-md.`
*   **Internal Layout Elements:**
    *   *Month Selector Header:* Horizontal Auto Layout. Align: Middle-Space Between. Includes previous month arrow button, active month text (`Body/Medium Semibold`), and next month arrow button.
    *   *Days-of-Week Row:* Horizontal Auto Layout. Gap: `6px`. Height: `28px`. Text: `Caption` (Caps), Centered. Color: `text-muted`.
    *   *Days Grid (6 rows of 7 columns):* Wrap layout (or nested vertical layout containing 6 horizontal rows). Cell Size: `32px * 32px`. Radius: `radius-pill` (for hover/selection).
*   **Day Cell States:**
    *   *Default:* Text style `Body/Medium`. Color: `text-primary`.
    *   *Hover:* Fill: `bg-secondary`.
    *   *Selected:* Fill: `brand-primary`. Text color: White.
    *   *Outside Month:* Text color: `text-muted` (opacity 40%).

---

### 5.14 Range Slider Component
The range slider allows users to select values within a specified range.

*   **Slider Track Bar:** Height: `6px`. Radius: `radius-pill`. Fill: `border-default`.
*   **Active Range Highlight:** Height: `6px`. Radius: `radius-pill`. Fill: `brand-primary`. Positioned on top of the track.
*   **Slider Knob Handle:**
    *   Structure: Circle frame measuring `18px * 18px`. Border: None. Fill: White. Shadow: `elevation-sm` plus `1px` border (Color: `brand-primary`).
*   **Knob States:**
    *   *Default:* Shadow: `elevation-sm`.
    *   *Hover / Dragging:* Active scale increases knob size to `20px`. Shadow: `elevation-glow`. Cursor: Grab / Grabbing.

---

### 5.15 Accordion / Details Drawer Panels
Accordions display collapsible content sections.

*   **Accordion Row Container:** Auto Layout: Vertical. Align: Top-Left. Width: Stretch. Border: Bottom divider `1px` solid `border-default`.
*   **Accordion Header Button:**
    *   Figma Setup: `Auto Layout: Horizontal. Align: Middle-Space Between. Height: 48px. Padding: 12px 16px. Cursor: Pointer.`
    *   Content: Header label (`Body/Medium Semibold`, Color: `text-primary`), trailing chevron icon (16px, Color: `text-secondary`).
*   **Header States:**
    *   *Default:* Fill: Transparent. Chevron rotated 0° (pointing right/down).
    *   *Hover:* Fill: `bg-secondary`.
    *   *Expanded:* Chevron rotated 180° (pointing up).
*   **Accordion Content Wells:**
    *   Figma Setup: `Auto Layout: Vertical. Padding: 16px 20px. Gap: 12px. Fill: bg-secondary (nested indentation).`

---

### 5.16 Progress Indicators & Loaders

#### 5.16.1 Horizontal Progress Bar
*   **Progress Track:** Height: `8px`. Radius: `radius-pill`. Fill: `border-default`.
*   **Progress Indicator:** Height: `8px`. Radius: `radius-pill`. Fill: `brand-primary` (or `status-success` for 100% completed progress).

#### 5.16.2 Circular Loading Spinner
*   **Structure:** Circular stroke path measuring `24px * 24px` (or `48px * 48px` for page loaders). Stroke thickness: `2.5px`.
*   **Visual Details:** Track is a light circle outline (Color: `border-default`, opacity 30%). Rotating indicator is a 90° arc highlight (Color: `brand-primary`).

#### 5.16.3 Skeleton Loading Frames
*   **Structure:** Semi-transparent placeholder boxes used to indicate loading content.
*   **Tokens:** Fill: `border-default` (Light: `#E2E8F0`, Dark: `#334155`). Opacity waves from 40% to 100% using a pulse animation.

---

### 5.17 File Upload Box Component
The file upload box allows users to upload files by dragging and dropping them into the zone.

*   **Auto-Layout Box:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Middle-Center. Height: 160px. Width: Stretch. Padding: 24px. Gap: 8px. Radius: radius-xl. Border: 2px dashed (border-default). Fill: bg-secondary.`
*   **Internal Layout Elements:**
    *   *Center Icon:* Cloud upload icon (24px, Color: `text-muted`).
    *   *Upload Prompt Text:* Text style `Body/Medium Semibold` ("Drag and drop your files here").
    *   *Subtext Label:* Text style `Body/Small` ("PDF, PNG, JPG up to 10MB").
*   **Drag-Over Active State:**
    *   Border Color: `brand-primary`.
    *   Fill Color: `brand-glow` (opacity 10%).
    *   Center Icon: Color changes to `brand-primary`.

---

### 5.18 Tooltip Component
Tooltips display descriptive text when hovering over elements.

*   **Auto-Layout Container:**
    *   Figma Setup: `Auto Layout: Vertical. Align: Centered. Padding: 6px 10px. Radius: radius-sm. Fill: #0F172A (Inverted dark fill for light mode, light grey for dark mode).`
*   **Text details:** Text style `Body/Small`. Color: White (or dark grey in dark mode). Max width: `200px`.
*   **Positioning:** Placed relative to parent coordinates (Top-Center, Bottom-Center, Left, Right). Includes a `6px` triangle pointer aligned to the target component.

---

### 5.19 Profile Avatar Component
Avatars represent users visually.

*   **Structure:** Circular frame. Radius: `radius-pill`. Sizes: Small (`24px`), Medium (`32px`, Default), Large (`48px`), Extra-Large (`96px`).
*   **Content Variants:**
    *   *User Profile Image:* Image content scale set to `Fill`.
    *   *Initial Placeholder:* Text style `Body/Medium Semibold` (caps). Text color: White. Fill: Random background colors mapped to user ID hashes.
    *   *Status Dot Indicator:* Bottom-right overlay circle (`8px * 8px`). Color matches status (Green for active, Grey for offline).

---

## 6. MICRO-INTERACTION & MOTION SPECIFICATIONS
Motion timing and transitions ensure that visual feedback feels responsive and smooth.

### 6.1 Duration Tokens
All animations must map to standard duration steps.

| Duration Token | Milliseconds | Usage Context |
| :--- | :--- | :--- |
| `motion-duration-instant` | `0ms` | Direct, immediate swaps (e.g., text tooltips appear) |
| `motion-duration-fast` | `150ms` | Hover states, focus outlines, checkbox/toggle fills |
| `motion-duration-base` | `250ms` | Page transitions, accordion opens, tab indicators |
| `motion-duration-slow` | `400ms` | Overlay dialog fade-in, drawer panel side-slides |
| `motion-duration-slowest` | `600ms` | Multi-step setup shifts, notification banners entrance |

---

### 6.2 Easing Functions (Bezier Curves)
Transition curves define the acceleration and deceleration behavior of micro-interactions.

```
       EASE-IN-OUT (Standard)                     EASE-OUT (Decelerate)
      1.0 +--------------+                       1.0 +--------------+
          |            /                         |         _--' 
          |          /                           |       -'   
          |       _-'                            |     -'     
      0.0 +--------------+                       0.0 +--------------+
          0.0          1.0                       0.0          1.0
```

*   **`motion-ease-standard` (Ease-in-out):**
    *   Figma Transition: `Smart Animate: Ease In and Out (Bezier: cubic-bezier(0.4, 0, 0.2, 1))`
    *   *Usage:* General state transitions (hover, focus, tab changes, cards).
*   **`motion-ease-out` (Decelerate):**
    *   Figma Transition: `Smart Animate: Ease Out (Bezier: cubic-bezier(0, 0, 0.2, 1))`
    *   *Usage:* Element entry animations (modals fading in, drawers sliding in).
*   **`motion-ease-in` (Accelerate):**
    *   Figma Transition: `Smart Animate: Ease In (Bezier: cubic-bezier(0.4, 0, 1, 1))`
    *   *Usage:* Element exit animations (modals fading out, notifications disappearing).
*   **`motion-ease-spring` (Responsive Spring Bounce):**
    *   Figma Transition: `Smart Animate: Custom Bezier: cubic-bezier(0.34, 1.56, 0.64, 1)`
    *   *Usage:* Interactive tabs, slider selectors, and sidebar expand transitions.

---

### 6.3 State Transition Matrix
This matrix defines the exact animation parameters for interactive components.

| Interactive Transition Event | Trigger Action | Affected Layer Properties | Target Duration | Target Easing | Animation Detail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Button State Transition** | Cursor Hover | Background Color | `150ms` | `motion-ease-standard` | Smooth fill transition |
| **Input Focus Transition** | Click / Tab Focus | Border Color, Shadow | `150ms` | `motion-ease-standard` | Stroke width expands to `2px` with a subtle elevation glow |
| **Toggle Switch Shift** | Tap / Click | Position (X), Background Color| `250ms` | `motion-ease-spring` | Switch slider slides horizontally with a slight elastic bounce |
| **Tabs Indicator Slip** | Click | Position (X), Width | `250ms` | `motion-ease-spring` | Active bar shifts underneath labels |
| **Accordion Menu Rollout**| Click Header | Height, Icon rotation | `250ms` | `motion-ease-standard` | Content area slides down while the arrow icon rotates 180° |
| **Modal Overlay Entry** | System Event | Opacity | `400ms` | `motion-ease-out` | Background overlay fades in |
| **Modal Card Entry** | System Event | Scale, Position (Y) | `400ms` | `motion-ease-spring` | Modal card drops down from `Y:-40px` and scales from `95%` to `100%` |
| **Drawer Slide-out Entry**| System Event | Position (X) | `400ms` | `motion-ease-out` | Drawer panel slides in from the right edge |
| **Kanban Card Lift** | Drag Action | Angle, Elevation | `200ms` | `motion-ease-standard` | Card scales up slightly, skews `2deg`, and drops a larger shadow |
| **Toast Alert Entry** | System Event | Position (Y), Opacity | `400ms` | `motion-ease-spring` | Toast slides up from the viewport edge and fades in |
| **Page Shift Transition** | Link Click | Opacity, Position (X) | `250ms` | `motion-ease-standard` | New page content shifts left slightly and fades in |

---

## 7. FIGMA FILE ORGANIZATION & COMPONENT DESIGN

To ensure designs remain maintainable, the Figma file structure must follow this page and layering hierarchy.

### 7.1 Page Structure & Naming Conventions
Organize the Figma file pages sequentially:
*   `⚙️ Global Tokens` — Contains the color, typography, spacing, and shadow variables.
*   `❖ Basic Atoms` — Contains basic UI components (Icons, Buttons, Checkboxes, Inputs).
*   `❖ Complex Molecules` — Contains composite components (KPI Cards, Table Rows, Headers, Modals).
*   `📁 CRM Pages / Dashboards` — High-fidelity CRM mockups.
*   `📁 HRM Pages / Directory` — High-fidelity HRM mockups.
*   `🧪 Prototype / Interactions` — Interactive prototypes and animations.

### 7.2 Layer Naming Conventions
*   Avoid generic layer names like `Frame 2938` or `Group 12`. All frames must use descriptive names.
*   Containers using auto-layout must be named based on their structural role (e.g., `row-container`, `input-wrapper`, `metric-card`).
*   Component structures must follow a slash-separated naming scheme to export cleanly to automated tools:
    `[Category]/[Component Name]/[Variant-Option-1]/[Variant-Option-2]`  
    *Example:* `Button/Primary/Medium/Hover`

### 7.3 Auto-Layout Design Constraints
*   **Dynamic Resizing (Fill vs. Hug):**
    *   Card layouts and text containers must be set to `Fill Container` (Horizontal) to resize correctly across screens.
    *   Form fields and buttons must use `Fill Container` horizontally, and `Hug Contents` vertically.
    *   Icons and badges must use `Fixed Width` and `Fixed Height` configurations.
*   **Margin & Alignment Rules:**
    *   Ensure all components align to the 8px grid (all padding, gaps, and border alignments must use spacing tokens).
    *   Text labels inside input fields must align to the top of the text frame to prevent clipping when font sizes change.

---

## 8. ACCESSIBILITY (A11Y) STANDARDS AND WCAG COMPLIANCE

The design system enforces compliance with accessibility guidelines.

### 8.1 Color Contrast Compliance (WCAG 2.1 AA)
*   **Text Contrast:** All text must maintain a contrast ratio of at least 4.5:1 against its background.
    *   Light mode: Dark grey text (`#1F2937`) on white cards exceeds this target.
    *   Dark mode: White/light grey text (`#F8FAFC`) on dark cards exceeds this target.
*   **Interactive Element Outlines:** Focus indicators and active border rings must maintain a contrast ratio of at least 3.0:1. Focus outlines use high-contrast primary colors (Light: `#2563EB`, Dark: `#3B82F6`) to ensure visibility.

### 8.2 Keyboard Navigation Patterns
*   **Focus Ring Outlines:** Focusable elements must display a `2px` focus outline when navigating by keyboard.
*   **Element Focus Order:** Interactive elements must navigate in a logical tab order (left-to-right, top-to-bottom).
*   **Dropdown Controls:** Menus and selects must support keyboard navigation (`Up/Down` arrow keys to navigate, `Enter` to select, `Escape` to close).

---

## 9. FIGMA VARIABLES EXPORT & AUTOMATED SYNC PIPELINE

To synchronize design tokens with codebase values automatically, use the token export configuration below.

### 9.1 JSON Variable Tokens Configuration (W3C Design Tokens Format)
```json
{
  "color": {
    "brand": {
      "primary": {
        "value": "{color.blue.600}",
        "type": "color"
      },
      "secondary": {
        "value": "{color.teal.500}",
        "type": "color"
      }
    },
    "surface": {
      "primary": {
        "value": "{color.gray.50}",
        "type": "color"
      },
      "card": {
        "value": "#FFFFFF",
        "type": "color"
      }
    }
  },
  "spacing": {
    "sm": {
      "value": "8px",
      "type": "dimension"
    },
    "md": {
      "value": "12px",
      "type": "dimension"
    },
    "lg": {
      "value": "16px",
      "type": "dimension"
    }
  },
  "radius": {
    "md": {
      "value": "6px",
      "type": "dimension"
    },
    "lg": {
      "value": "10px",
      "type": "dimension"
    }
  }
}
```

### 9.2 Style Dictionary Export Pipeline
To convert exported Figma token JSON values into CSS custom properties, use the Style Dictionary compilation configuration below.

```javascript
// config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'frontend/src/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables'
      }]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'frontend/src/services/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/module'
      }]
    }
  }
};
```

---

## 10. SPECIFICATION COMPLIANCE CHECKLIST FOR AUDITING

Use this checklist to verify that designs comply with the system specifications before handoff.

- [ ] All colors used link to defined semantic HSL variables (e.g., `surface/primary`). No hardcoded hex values are used.
- [ ] Typography styles match the size, line height, and letter spacing defined in the typography scale.
- [ ] Component layouts use the 8px grid (all spacing, padding, and gaps use spacing tokens).
- [ ] Responsive layouts adjust correctly across all target breakpoints.
- [ ] Active and focus states include visual outlines to ensure accessibility.
- [ ] Component names follow the slash-separated naming convention (e.g., `Category/Component/State`).
- [ ] Micro-interactions use standard duration tokens and easing functions.
- [ ] Nested elements use the auto-layout resizing rules (Fill, Hug, and Fixed) correctly.
