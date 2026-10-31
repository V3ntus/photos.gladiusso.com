# Halide Portfolio — Motion & Animation Specification
*Tactile Darkroom Sensibility, Minimalist Restraint, Warm Tungsten Accents*

---

## 1. Design Philosophy: "The Analog Pace"
In an analog darkroom, nothing is instant. Silver crystals react over seconds under red safelight; paper submerges into chemistry with deliberate care; enlargement easels slide smoothly into registration.

Our motion system avoids glossy, bouncy "tech" micro-interactions. Instead, all transitions feel **weighted, physical, and optical**—governed by subtle exposure fades, gentle grain shifts, mechanical rack-focus cues, and slow-burn warm amber glow.

---

## 2. Global Transition Architecture

### 2.1 Screen & Route Transitions ("Darkroom Exposure Shift")
* **Concept:** When navigating between sections (`01 All Photos` ↔ `02 Albums` ↔ `03 Stories` ↔ `04 Inspection`), the current content dips gently in luminance like turning down an enlarger lamp, while incoming content emerges from deep shadow.
* **Duration & Easing:**
  - `exit`: `opacity: 1 -> 0`, `transform: translateY(0) -> translateY(-4px)`, `duration: 280ms`, `cubic-bezier(0.4, 0.0, 1, 1)` (quick fade out).
  - `enter`: `opacity: 0 -> 1`, `transform: translateY(8px) -> translateY(0)`, `duration: 480ms`, `cubic-bezier(0.16, 1, 0.3, 1)` (deliberate, graceful settle).
* **Sidebar Indicator Movement:**
  - The active gold bullet and yellow highlight bar move along the left rail using a smooth sliding spring:
  ```css
  transition: transform 380ms cubic-bezier(0.25, 1, 0.5, 1), color 240ms ease;
  ```

---

## 3. Ambient Animations (Subtle & Organic)

### 3.1 Organic Film Grain & Halation Shimmer (Ambient Background)
* **Visual:** An ultra-subtle, low-opacity procedural grain overlay on the deep obsidian background (`#0d0e11`) with a faint breathing tungsten ambient glow in the top-right vignette.
* **Implementation (CSS Keyframes):**
  ```css
  @keyframes darkroom-amber-breathe {
    0%, 100% {
      opacity: 0.12;
      transform: scale(1) translate(0, 0);
    }
    50% {
      opacity: 0.22;
      transform: scale(1.04) translate(-1%, 1%);
    }
  }
  .ambient-amber-glow {
    animation: darkroom-amber-breathe 14s ease-in-out infinite;
    will-change: opacity, transform;
  }
  ```

### 3.2 Continuous Film Strip Horizontal Rail ("Continuous Exposure")
* **Visual:** On the *All Photos* screen, the featured negative rail sits at rest; the whole film is revealed by scrubbing through the horizontal viewport.
* **Interaction:**
  - Cursor drag / wheel: 1:1 smooth scrub with elastic snap-to-frame.
  - Rest position: a lead-in and lead-out of blank film park the first negative in the gate at rest, and the last negative in the same gate at full scrub.
  - Scrub affordance: `grab` / `grabbing` cursor, film laps into obsidian at the scrollport ends (edge fades), fixed tungsten gate ticks mark where snap settles a frame, and chevrons pinned to the scrollport edges appear only while film overflows on that side.

---

## 4. Micro-Interactions & Hover Dynamics

### 4.1 Plate & Photo Hover ("Enlarger Exposure Lift")
* **Interaction:** Hovering over a photo plate in the archive or contact sheet:
  - **Image:** Slight exposure boost (brightness `1.0 -> 1.05`, contrast `1.0 -> 1.02`), soft zoom (`scale(1.0) -> scale(1.015)`).
  - **Frame Border:** Border color shifts from `#26272b` to warm amber `#f59e0b` at 35% opacity.
  - **Frame Numbering:** Tag `▶ 14A` glints with a soft amber pulse.
  ```css
  .photo-plate-card {
    transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1),
                border-color 300ms ease,
                box-shadow 400ms ease;
  }
  .photo-plate-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.7),
                0 0 20px -4px rgba(245, 158, 11, 0.08);
  }
  .photo-plate-card img {
    transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1),
                filter 400ms ease;
  }
  .photo-plate-card:hover img {
    transform: scale(1.018);
    filter: brightness(1.04) contrast(1.02);
  }
  ```

### 4.2 Lightbox & Loupe Magnification (Screen 4)
* **The Loupe Movement:**
  - Mouse moves across the negative preview: the circular brass loupe ring follows with a damped spring lag (`lerp(current, target, 0.12)`).
  - Inside the loupe aperture: magnified high-res grain moves inversely with sub-pixel crispness.
  - Reticle & Crosshair: Soft pulsing amber indicator `8X LOUPE` with 2-second breath cycle.

### 4.3 Editorial Story Scroll (Screen 3)
* **Scroll-Triggered Image Reveals:**
  - Plates enter viewport using `IntersectionObserver`: soft unmasking clip-path from bottom to top (simulating photographic emulsion developing on wet paper).
  ```css
  @keyframes emulsion-develop {
    from {
      opacity: 0;
      filter: blur(4px) contrast(1.4);
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      filter: blur(0px) contrast(1);
      transform: translateY(0);
    }
  }
  ```
* **Pull Quotes & Section Dividers:**
  - Golden quote marks glow gently as they pass the reading center of the screen.

---

## 5. Accessibility & Performance Guardrails
* **`prefers-reduced-motion` compliance:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
* GPU-accelerated properties only (`transform`, `opacity`, `filter`). Zero layout shifts (`top`/`left`/`width`/`height` are never animated).
