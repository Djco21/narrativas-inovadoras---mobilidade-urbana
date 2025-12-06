# Map Features Implementation

## Core Interactions
- [ ] Implement Flashlight Effect for POIs <!-- id: 1 -->
    - []  Hide `poi-label` and `transit-label` by default (opacity 0)
    - [ ] Reveal them (opacity 1) when cursor is within 100px radius
    - [ ] Use animation to transition opacity

- [ ] Verify Implementation <!-- id: 2 -->
    - [ ] Open browser
    - [ ] Hit the stop ('parar') button
    - [ ] Test implementation with mouse events

## Extension points
- [ ] Extension: Restore 3D Buildings <!-- id: 3 -->
    - **Trigger**: Map style lacks 3D depth (Default expectation failed)
    - **Flow**: Add `fill-extrusion` layer to match original 3D style

- [ ] Extension: Flashlight not working <!-- id: 4 -->
    - **Trigger**: After testing, either:
        - All icons appear
        - Animation does not work
    - **Flow**: Go back to core interactions



