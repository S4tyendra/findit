# Lost and Found Application - Development Plan

**Project Goal:** Create a web application where users can report lost items with details and images. A unique management link is emailed to the reporter. Visitors can view reported items and notify the reporter if they find an item by providing their contact information, which is then emailed to the reporter.

**Core Technologies:**

*   **Backend:** FastAPI (Python), MongoDB (via Motor)
*   **Frontend:** Next.js (React), shadcn/ui, Tailwind CSS
*   **APIs:** `api.devh.in` for location data, SMTP (Gmail) for email.

**Database Name:** `lost_n_found`

**Information Collected per Item:**
*   Item Description (Text)
*   Reporter's Email (Email)
*   Date Lost (Date)
*   Product Link (Optional URL)
*   Up to 5 Images
*   Location (Country, State, City - Added in Phase 4)

**Image Storage:** Local `./images/` directory relative to the backend project root.

**Homepage Requirements:**
*   Branding on the left side.
*   Prominent "Add Lost Item" button.
*   Location filtering/selection capabilities (Phase 4).
*   Display area for lost items (list or grid).

**Phase Plan:**

```mermaid
graph TD
    A[Phase 1: Backend Setup & Core Reporting] --> B(Phase 2: Frontend - Reporting & Management View);
    B --> C(Phase 3: Public Viewing & 'Found' Feature);
    C --> D(Phase 4: Location API & Homepage Integration);
    D --> E(Phase 5: Item Management - Update/Delete);
    E --> F(Phase 6: Refinements & Testing);

    subgraph Backend (FastAPI, DB: lost_n_found)
        direction LR
        P1_1[Update Config: Email, Location API, DB Name]
        P1_2[Define Models: Pydantic & DB Schema (incl. date_lost, product_link, multiple images)]
        P1_3[Implement POST /api/items (handle new fields & up to 5 images)]
        P1_4[Implement Image Upload to ./images/]
        P1_5[Implement Email Service & Send Mgmt Link]
        P1_6[Setup DB Indexes for lost_items in main.py]
        P1_7[Add /images static route]
        P3_1[Implement GET /api/items/{id} public view]
        P3_2[Implement GET /api/items list view (consider location filtering later)]
        P3_3[Implement POST /api/items/{id}/found endpoint]
        P3_4[Update Email Service for 'Found' notification]
        P4_1[Implement Location Service Client]
        P4_2[Implement GET /api/locations/* endpoints]
        P5_1[Implement PUT /api/items/{id}/manage endpoint]
        P5_2[Implement DELETE /api/items/{id}/manage endpoint]
        P2_1[Implement GET /api/items/{id}/manage endpoint (auth w/ token)]
    end

    subgraph Frontend (Next.js, shadcn/ui)
        direction LR
        P2_2[Setup API Client Lib]
        P2_3[Create /report page & form (incl. new fields, multi-image upload)]
        P2_4[Create /manage/{id} page (view only)]
        P2_5[Handle Token in localStorage]
        P3_5[Create /item/{id} public view page (display new fields)]
        P3_6[Create Homepage layout (branding, Add button, item list area)]
        P3_7[Implement 'I Found This' Button & Form]
        P4_3[Create LocationSelector component]
        P4_4[Integrate LocationSelector into report/manage forms & Homepage]
        P5_3[Add Update/Delete UI to /manage page (handle new fields)]
    end

    %% Link phases to tasks
    A --- P1_1 & P1_2 & P1_3 & P1_4 & P1_5 & P1_6 & P1_7
    B --- P2_1 & P2_2 & P2_3 & P2_4 & P2_5
    C --- P3_1 & P3_2 & P3_3 & P3_4 & P3_5 & P3_6 & P3_7
    D --- P4_1 & P4_2 & P4_3 & P4_4
    E --- P5_1 & P5_2 & P5_3
    F --- G[Final Polish & Test]

```

**Phase Details:**

1.  **Phase 1: Backend Setup & Core Reporting**
    *   Update `config.py` with email credentials (Gmail SMTP), location API key/URL, and set `MONGO_DB_NAME` to `lost_n_found`.
    *   Define Pydantic models (`LostItemCreate`, `LostItemResponse`, etc.) and the MongoDB document structure for `lost_items` (including new fields).
    *   Implement the `/api/items` (POST) endpoint: handle form data (including new fields), save up to 5 images to `images/`, generate a management token, save item to DB.
    *   Implement an email utility to send the management link (`/manage/{item_id}?token={token}`) via Gmail SMTP.
    *   Update `main.py` startup event to create indexes for the `lost_items` collection (e.g., on `management_token`).
    *   Add a FastAPI route to serve images statically from the `./images/` directory.

2.  **Phase 2: Frontend - Reporting & Management View**
    *   Set up helper functions/hooks in `fend/src/lib/` or `fend/src/hooks/` for API calls.
    *   Create the `/report` page (`fend/src/pages/report.jsx`) with a form using shadcn components for all required fields (incl. date, optional link, multi-image upload). Call POST `/api/items`.
    *   Create the `/manage/[item_id].jsx` page. Fetch item data using `item_id` and `token` via GET `/api/items/{item_id}/manage`. Display details (read-only for now). Store token in localStorage.

3.  **Phase 3: Public Viewing & "Found" Feature**
    *   **Backend:** GET `/api/items/{item_id}` (public details), GET `/api/items` (list), POST `/api/items/{item_id}/found` (receives finder contact, emails reporter).
    *   **Frontend:** `/item/[item_id].jsx` page, update homepage layout (`/`) to list items, "I Found This" button/modal/form.

4.  **Phase 4: Location API & Homepage Integration**
    *   **Backend:** Location service client, GET `/api/locations/...` endpoints.
    *   **Frontend:** `LocationSelector` component. Integrate into report/manage forms. Integrate location filtering/selection into Homepage.

5.  **Phase 5: Item Management (Update/Delete)**
    *   **Backend:** PUT `/api/items/{item_id}/manage` (update), DELETE `/api/items/{item_id}/manage` (delete). Both require token.
    *   **Frontend:** Enhance `/manage/[item_id].jsx` with editing capabilities, Save/Delete buttons.

6.  **Phase 6: Refinements & Testing**
    *   Error handling, UI/UX polish, thorough testing.