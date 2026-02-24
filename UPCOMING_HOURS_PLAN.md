# Blogify Upcoming Hours Plan

## Goal
Ship a safer, cleaner, and more modern Blogify with improved UI and core features in a practical sequence.

## Phase 0: Immediate Setup (Hour 0)
1. Create a working branch for changes.
2. Confirm `.env` has all required keys.
3. Rotate compromised secrets (Cloudinary and JWT).
4. Remove hardcoded secrets from code.

## Phase 1: Security and Data Fixes (Hours 1-2)
1. Move Cloudinary config to environment variables.
2. Move JWT secret to `JWT_SECRET` in `.env`.
3. Add auth guard middleware (`requireAuth`) for:
   - `POST /blog`
   - `POST /blog/comment/:blogId`
   - `GET /blog/add-new`
4. Fix `Comment` schema:
   - `blogId` -> `ObjectId` ref `blog`
   - `createdBy` -> `ObjectId` ref `user`
5. Add basic input validation for blog and comment forms.

## Phase 2: UI Foundation Revamp (Hours 2-4)
1. Create `public/css/theme.css` with design tokens:
   - Colors
   - Typography scale
   - Spacing
   - Radius and shadows
2. Update `views/partials/head.ejs` to include new stylesheet.
3. Redesign `views/partials/nav.ejs`:
   - Dynamic user name (`locals.user.fullName`)
   - Better spacing and responsive behavior
4. Clean old style rules from `public/css/nav.css` and keep only component-level nav styles.

## Phase 3: Homepage Redesign (Hours 4-6)
1. Redesign `views/home.ejs` with:
   - Hero section
   - Search/filter bar placeholder
   - Improved card grid layout
2. Improve blog cards:
   - Better cover image ratio
   - Title clamp
   - Meta row (author/date/read time placeholder)
3. Add empty state when no blogs are found.
4. Ensure responsive design for mobile, tablet, desktop.

## Phase 4: Blog Detail Experience (Hours 6-8)
1. Redesign `views/blog.ejs`:
   - Cover image section
   - Better typography for content
   - Author info block
2. Improve comments section UI:
   - Better comment form
   - Better list spacing and avatar alignment
3. Add safe handling when blog image is missing.

## Phase 5: Authoring Improvements (Hours 8-10)
1. Redesign `views/addBlog.ejs`:
   - Better form structure
   - File input guidance
   - Validation feedback
2. Extend `Blog` model:
   - `slug`
   - `excerpt`
   - `tags`
   - `status` (`draft`/`published`)
3. Update create route to generate slug and save new fields.

## Phase 6: Discovery Features (Hours 10-12)
1. Add search by title/tags on homepage.
2. Add filter (latest/oldest/popular placeholder).
3. Add pagination for blog listing.
4. Add related posts block on blog detail page.

## Phase 7: Ownership and Engagement (Hours 12-15)
1. Add edit and delete for blog owner only.
2. Add likes feature (like/unlike).
3. Add bookmarks feature (save for later).
4. Add optional threaded comments (reply to comment).

## Phase 8: Stability and Launch Readiness (Hours 15-18)
1. Add centralized error handler middleware.
2. Add request logging and basic rate limiting.
3. Add basic test coverage for:
   - Auth flows
   - Blog create
   - Comment create
4. Add SEO basics:
   - Dynamic page titles
   - Meta descriptions
   - Open Graph tags

## Deliverables Checklist
1. Security fixes complete and secrets moved to env.
2. New design system (`theme.css`) applied globally.
3. Home, blog detail, add blog, signin, signup pages redesigned.
4. Blog model upgraded with slug/excerpt/tags/status.
5. Search + filter + pagination live.
6. Edit/delete + like/bookmark implemented.
7. Error handling, logging, and baseline tests in place.

## Execution Rule
1. Do not start a new phase until current phase passes manual testing.
2. Commit at the end of each phase with clear messages.
3. Keep UI responsive and consistent after every phase.
